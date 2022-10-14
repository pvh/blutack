import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  PointerEventHandler,
  useMemo,
} from "react"
import { getStroke, StrokePoint } from "perfect-freehand"

import { Document, Page, pdfjs } from "react-pdf"

// TODO: see if we can find a better way to load this file;
// some ideas: https://github.com/wojtekmaj/react-pdf/issues/97
pdfjs.GlobalWorkerOptions.workerSrc = `/src/assets/pdf.worker.js`

import { useDocument } from "automerge-repo-react-hooks"
import { FileDoc } from "."

import * as ContentTypes from "../../pushpin-code/ContentTypes"
import Content, { ContentProps } from "../../Content"
import "./PdfContent.css"
import {
  useBinaryDataContents,
  useBinaryDataHeader,
} from "../../../blobstore/Blob"
import { useConfirmableInput } from "../../pushpin-code/Hooks"
import {
  createDocumentLink,
  parseDocumentLink,
  PushpinUrl,
} from "../../pushpin-code/ShareLink"
import ContentList, { ContentListDoc, ContentListInList } from "../ContentList"
import { DocHandle, DocumentId } from "automerge-repo"
import { ContactDoc } from "../contact"
import classNames from "classnames"
import TitleWithSubtitle from "../../ui/TitleWithSubtitle"
import Heading from "../../ui/Heading"

export interface PdfAnnotation {
  stroke: number[][]
  page: number
  authorId: DocumentId
}

export interface PdfDoc extends FileDoc {
  content: string
  annotations: PdfAnnotation[]
}

const PAGE_WIDTH = 1600
const PAGE_HEIGHT = 2070

const STROKE_PARAMS = {
  size: 10,
  thinning: 0.1,
  smoothing: 0.75,
  streamline: 0.5,
}

type Point = number[]

function getSvgPathFromStroke(stroke: Point[]) {
  if (!stroke.length) return ""

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length]
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
      return acc
    },
    ["M", ...stroke[0], "Q"]
  )

  d.push("Z")
  return d.join(" ")
}

export default function PdfContent(props: ContentProps) {
  const [points, setPoints] = React.useState<Point[]>([])
  const [author] = useDocument<ContactDoc>(props.selfId)
  const [isMarkerSelected, setIsMarkerSelected] = React.useState<boolean>(false)
  const [isAnnotationGroupHidden, setIsAnnotationGroupHidden] = React.useState<{
    [authorId: DocumentId]: boolean
  }>({})

  const toggleIsAnnotationGroupOfAuthorHidden = (authorId: DocumentId) => {
    if (!isAnnotationGroupHidden[authorId]) {
      setIsMarkerSelected(false)
    }

    setIsAnnotationGroupHidden((isAnnotationGroupHidden) => ({
      ...isAnnotationGroupHidden,
      [authorId]: !isAnnotationGroupHidden[authorId],
    }))
  }

  const handlePointerDown: PointerEventHandler<SVGSVGElement> = useCallback(
    (e: any) => {
      if (!isMarkerSelected) {
        return
      }

      const bounds = e.target.getBoundingClientRect()
      const x = ((e.clientX - bounds.left) / bounds.width) * PAGE_WIDTH
      const y = ((e.clientY - bounds.top) / bounds.height) * PAGE_HEIGHT

      e.target.setPointerCapture(e.pointerId)

      setPoints([[x, y, e.pressure]])
      e.preventDefault()
    },
    [points, isMarkerSelected]
  )

  const handlePointerMove: PointerEventHandler<SVGSVGElement> = useCallback(
    (e: any) => {
      if (!isMarkerSelected) {
        return
      }

      if (e.buttons !== 1) return

      const bounds = e.target.getBoundingClientRect()
      const x = ((e.clientX - bounds.left) / bounds.width) * PAGE_WIDTH
      const y = ((e.clientY - bounds.top) / bounds.height) * PAGE_HEIGHT

      setPoints([...points, [x, y, e.pressure]])
      e.preventDefault()
    },
    [points, isMarkerSelected]
  )

  const toggleIsMarkerSelected = useCallback(() => {
    if (!isMarkerSelected) {
      setIsAnnotationGroupHidden(() => ({
        ...isAnnotationGroupHidden,
        [props.selfId]: false,
      }))
    }

    setIsMarkerSelected((isMarkerSelected) => !isMarkerSelected)
  }, [])

  const handlePointerUp: PointerEventHandler<SVGSVGElement> = useCallback(
    (e) => {
      if (!isMarkerSelected) {
        return
      }

      if (points.length !== 0) {
        changePdf((pdf) => {
          pdf.annotations.push({
            stroke: getStroke(points, STROKE_PARAMS),
            page: pageNum,
            authorId: props.selfId,
          })
        })

        setPoints([])
        e.preventDefault()
      }
    },
    [points, isMarkerSelected]
  )

  const stroke = getStroke(points, STROKE_PARAMS)

  const pathData = getSvgPathFromStroke(stroke)

  const [pdf, changePdf] = useDocument<PdfDoc>(props.documentId)

  const buffer = useBinaryDataContents(pdf && pdf.binaryDataId)
  const [pageNum, setPageNum] = useState(1)
  const [numPages, setNumPages] = useState(0)
  const [pageInputValue, onPageInput] = useConfirmableInput(
    String(pageNum),
    (str) => {
      const nextPageNum = Number.parseInt(str, 10)

      setPageNum(Math.min(numPages, Math.max(1, nextPageNum)))
    }
  )

  function goForward() {
    if (pageNum < numPages) {
      setPageNum(pageNum + 1)
    }
  }

  function goBack() {
    if (pageNum > 1) {
      setPageNum(pageNum - 1)
    }
  }

  const onDocumentLoadSuccess = useCallback(
    (result: any) => {
      const { numPages } = result

      setNumPages(numPages)

      result.getMetadata().then((metadata: any) => {
        const { info = {} } = metadata
        const { Title } = info

        if (Title && pdf && !pdf.title) {
          changePdf((doc) => {
            doc.title = Title
          })
        }
      })

      if (pdf && !pdf.content) {
        getPDFText(result).then((content) => {
          changePdf((doc) => {
            doc.content = content
          })
        })
      }
    },
    [changePdf, pdf]
  )

  const param = useMemo(
    () => ({
      data: buffer,
    }),
    [buffer]
  )

  if (!pdf) {
    return null
  }

  // todo: annotationList initation shouldn't happen in view

  if (!pdf.annotations) {
    changePdf((pdf) => {
      pdf.annotations = []
    })
  }

  const { context } = props

  const annotations = pdf.annotations ?? []
  const annotationByAuthor = annotations.reduce(
    (group: { [id: DocumentId]: PdfAnnotation[] }, annotation) => {
      if (!group[annotation.authorId]) {
        group[annotation.authorId] = []
      }
      group[annotation.authorId].push(annotation)
      return group
    },
    {}
  )

  const forwardDisabled = pageNum >= numPages
  const backDisabled = pageNum <= 1

  return (
    <div className="PdfContent">
      <div
        className={classNames("PdfContent-main", {
          "is-marker-selected": isMarkerSelected,
        })}
      >
        <div className="PdfContent-header">
          <div className="PdfContent-header-left"></div>
          <button
            disabled={backDisabled}
            type="button"
            onClick={goBack}
            className="PdfContent-button"
          >
            <i className="fa fa-angle-left" />
          </button>
          <input
            className="PdfContent-headerInput"
            value={pageInputValue}
            type="number"
            min={1}
            max={numPages}
            onChange={onPageInput}
            onKeyDown={onPageInput}
          />
          <div className="PdfContent-headerNumPages">/ {numPages}</div>
          <button
            disabled={forwardDisabled}
            type="button"
            onClick={goForward}
            className="PdfContent-button"
          >
            <i className="fa fa-angle-right" />
          </button>

          <div className="PdfContent-header-right">
            <button
              disabled={forwardDisabled}
              type="button"
              onClick={toggleIsMarkerSelected}
              className={classNames("PdfContent-button ", {
                "is-selected": isMarkerSelected,
              })}
            >
              <i className="fa fa-pencil" />
            </button>
          </div>
        </div>

        <div className="PdfContent-document">
          {buffer ? (
            <Document file={param} onLoadSuccess={onDocumentLoadSuccess}>
              <Page
                loading=""
                pageNumber={pageNum}
                className="PdfContent-page"
                width={1600}
                renderTextLayer={false}
              />
            </Document>
          ) : null}

          <svg
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            viewBox="0 0 1600 2070"
            width={PAGE_WIDTH}
            height={PAGE_HEIGHT}
            style={{
              position: "absolute",
              top: 0,
              width: "100%",
              height: "auto",
            }}
          >
            {
              // TODO: we should be using Content here, but I need to pass the selectedPage to the view
              pdf.annotations &&
                pdf.annotations.map((annotation, index) => {
                  if (
                    annotation.page !== pageNum ||
                    isAnnotationGroupHidden[annotation.authorId]
                  ) {
                    return
                  }

                  return (
                    <PdfAnnotationOverlayView
                      key={index}
                      annotation={annotation}
                    />
                  )
                })
            }

            {points && (
              <path
                d={pathData}
                opacity={0.5}
                fill={author?.color ?? "#fdd835"}
              />
            )}
          </svg>
        </div>
      </div>
      <div className="PdfContent-sidebar">
        <Heading>Annotations by</Heading>

        {Object.entries(annotationByAuthor).map(([authorId, annotations]) => (
          <AnnotationGroup
            authorId={authorId as DocumentId}
            annotations={annotations}
            key={authorId}
            isHidden={isAnnotationGroupHidden[authorId as DocumentId]}
            onToggleIsHidden={() =>
              toggleIsAnnotationGroupOfAuthorHidden(authorId as DocumentId)
            }
          />
        ))}
      </div>
    </div>
  )
}

function AnnotationGroup({
  authorId,
  annotations,
  isHidden,
  onToggleIsHidden,
}: {
  authorId: DocumentId
  annotations: PdfAnnotation[]
  isHidden: boolean
  onToggleIsHidden: () => void
}) {
  const [author] = useDocument(authorId)

  return (
    <div className="PdfContent-annotationGroup">
      <input type="checkbox" checked={!isHidden} onChange={onToggleIsHidden} />
      <Content context="list" url={createDocumentLink("contact", authorId)} />
    </div>
  )
}

function PdfAnnotationOverlayView({
  annotation,
}: {
  annotation: PdfAnnotation
}) {
  const [author] = useDocument<ContactDoc>(annotation.authorId)

  const pathData = getSvgPathFromStroke(annotation.stroke)

  return <path d={pathData} opacity={0.5} fill={author?.color ?? "#fdd835"} />
}

const supportsMimeType = (mimeType: string) =>
  !!mimeType.match("application/pdf")

ContentTypes.register({
  type: "pdf",
  name: "PDF",
  icon: "file-pdf-o",
  unlisted: true,
  contexts: {
    workspace: PdfContent,
    board: PdfContent,
  },
  supportsMimeType,
})

//TODO: any types
const getPageText = async (pdf: any, pageNo: number): Promise<string> => {
  const page = await pdf.getPage(pageNo)
  const tokenizedText = await page.getTextContent()
  const pageText = tokenizedText.items.map((token: any) => token.str).join("")
  return pageText
}

export const getPDFText = async (pdf: any): Promise<string> => {
  const maxPages = pdf.numPages
  const pageTextPromises: Promise<string>[] = []
  for (let pageNo = 1; pageNo <= maxPages; pageNo += 1) {
    pageTextPromises.push(getPageText(pdf, pageNo))
  }
  const pageTexts = await Promise.all(pageTextPromises)
  return pageTexts.join(" ")
}
