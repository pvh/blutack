import React, { useState, useCallback, useEffect, useRef, PointerEventHandler, useMemo } from 'react'
import { getStroke, StrokePoint } from 'perfect-freehand'

import { Document, Page, pdfjs } from 'react-pdf'

// TODO: see if we can find a better way to load this file;
// some ideas: https://github.com/wojtekmaj/react-pdf/issues/97
pdfjs.GlobalWorkerOptions.workerSrc = `/src/assets/pdf.worker.js`;

import { useDocument } from 'automerge-repo-react-hooks'
import { FileDoc } from '.'

import * as ContentTypes from '../../pushpin-code/ContentTypes'
import Content, { ContentProps } from '../../Content'
import './PdfContent.css'
import { useBinaryDataContents, useBinaryDataHeader } from '../../../blobstore/Blob'
import { useConfirmableInput } from '../../pushpin-code/Hooks'
import { createDocumentLink, parseDocumentLink, PushpinUrl } from "../../pushpin-code/ShareLink";
import ContentList, { ContentListDoc, ContentListInList } from "../ContentList";
import { DocHandle } from "automerge-repo";

export interface PdfAnnotationDoc {
  stroke: number[][]
  pdfDocUrl: PushpinUrl
  page: number
}

ContentTypes.register({
  type: 'pdfannotation',
  name: 'PDF Annotation',
  icon: 'highlighter-line',
  contexts: {
  },
  create: createAnnotation,
})

function createAnnotation(attrs: any, handle: DocHandle<any>) {
  handle.change((doc: PdfAnnotationDoc) => {
    doc.stroke = attrs.stroke
    doc.pdfDocUrl = attrs.pdfDocUrl
    doc.page = attrs.page
  })
}

export interface PdfDoc extends FileDoc {
  content: string
  annotationListUrl: PushpinUrl
}

const PAGE_WIDTH = 1600
const PAGE_HEIGHT = 2070

const STROKE_PARAMS = {
  size: 30,
  thinning: 0.5,
  smoothing: 0.5,
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

  const handlePointerDown: PointerEventHandler<SVGSVGElement> = useCallback((e: any) => {
    const bounds = e.target.getBoundingClientRect();
    const x = ((e.clientX - bounds.left) / bounds.width) * PAGE_WIDTH
    const y = ((e.clientY - bounds.top) / bounds.height) * PAGE_HEIGHT

    e.target.setPointerCapture(e.pointerId)

    setPoints([[x, y, e.pressure]])
  }, [points])

  const handlePointerMove: PointerEventHandler<SVGSVGElement> = useCallback((e: any) => {
    if (e.buttons !== 1) return

    const bounds = e.target.getBoundingClientRect();
    const x = ((e.clientX - bounds.left) / bounds.width) * PAGE_WIDTH
    const y = ((e.clientY - bounds.top) / bounds.height) * PAGE_HEIGHT

    setPoints([...points, [x, y, e.pressure]])
  }, [points])


  const handlePointerUp: PointerEventHandler<SVGSVGElement> = useCallback(() => {
    if (points.length !== 0) {
      ContentTypes.create("pdfannotation", {
        stroke: getStroke(points, STROKE_PARAMS),
        pdfDocUrl: createDocumentLink("pdf", props.documentId),
        page: 0
      }, (pdfAnnotationUrl) => {

        changeAnnotationList((annotationsList) => {
          annotationsList.content.push(pdfAnnotationUrl)
        })

        setPoints([])
      })

      getStroke(points, STROKE_PARAMS)
    }
  }, [points])


  const stroke = getStroke(points, STROKE_PARAMS)

  const pathData = getSvgPathFromStroke(stroke)

  const [pdf, changePdf] = useDocument<PdfDoc>(props.documentId)
  const [annotationList, changeAnnotationList] = useDocument<ContentListDoc>(pdf ? parseDocumentLink(pdf.annotationListUrl).documentId : undefined)

  const buffer = useBinaryDataContents(pdf && pdf.binaryDataId)
  const [pageNum, setPageNum] = useState(1)
  const [numPages, setNumPages] = useState(0)
  const [pageInputValue, onPageInput] = useConfirmableInput(String(pageNum), (str) => {
    const nextPageNum = Number.parseInt(str, 10)

    setPageNum(Math.min(numPages, Math.max(1, nextPageNum)))
  })

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

  const param = useMemo(() => ({
    data: buffer
  }), [buffer])

  if (!pdf) {
    return null
  }

  // todo: annotationList initation shouldn't happen in view

  if (!pdf.annotationListUrl) {
    ContentTypes.create("contentlist",  { title: "annotations" }, (annotationListUrl) => {
      changePdf(pdf => {
        pdf.annotationListUrl = annotationListUrl
      })
    })
  }


  const { context } = props

  const forwardDisabled = pageNum >= numPages
  const backDisabled = pageNum <= 1

  return (
    <div style={{ position: "relative" }}>
      {pdf.annotationListUrl && (
        <Content context="list" url={pdf.annotationListUrl} />
      )}

      <div className="PdfContent-header">
        <button
          disabled={backDisabled}
          type="button"
          onClick={goBack}
          className="PdfContent-navButton"
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
          className="PdfContent-navButton"
        >
          <i className="fa fa-angle-right" />
        </button>
      </div>

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
        width={PAGE_WIDTH} height={PAGE_HEIGHT}
        style={{
          position: "absolute",
          top: 0,
          width: "100%",
          height: "auto"
        }}
      >
        {points && <path d={pathData} opacity={0.5} fill="#fdd835"/>}
      </svg>
    </div>
  )
}

const supportsMimeType = (mimeType: string) => !!mimeType.match('application/pdf')

ContentTypes.register({
  type: 'pdf',
  name: 'PDF',
  icon: 'file-pdf-o',
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
  const pageText = tokenizedText.items.map((token: any) => token.str).join('')
  return pageText
}

export const getPDFText = async (pdf: any): Promise<string> => {
  const maxPages = pdf.numPages
  const pageTextPromises: Promise<string>[] = []
  for (let pageNo = 1; pageNo <= maxPages; pageNo += 1) {
    pageTextPromises.push(getPageText(pdf, pageNo))
  }
  const pageTexts = await Promise.all(pageTextPromises)
  return pageTexts.join(' ')
}


