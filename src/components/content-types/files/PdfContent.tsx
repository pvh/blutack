import React, { useState, useCallback, PointerEventHandler, useMemo } from "react"
import { getStroke, StrokePoint } from "perfect-freehand"

import { Document, Page, pdfjs } from "react-pdf"

// TODO: see if we can find a better way to load this file;
// some ideas: https://github.com/wojtekmaj/react-pdf/issues/97
pdfjs.GlobalWorkerOptions.workerSrc = `/blutack/pdf.worker.js`

import { useDocument } from "automerge-repo-react-hooks"
import { FileDoc } from "."

import * as ContentTypes from "../../pushpin-code/ContentTypes"
import Content, { ContentProps } from "../../Content"
import "./PdfContent.css"
import { createBinaryDataUrl } from "../../../blobstore/Blob"
import { useConfirmableInput } from "../../pushpin-code/Hooks"
import { PushpinUrl } from "../../pushpin-code/Url"
import { DocumentId } from "automerge-repo"
import { ContactDoc } from "../contact"
import classNames from "classnames"
import ListMenuItem from "../../ui/ListMenuItem"
import ListMenuSection from "../../ui/ListMenuSection"
import { ContentType } from "../../pushpin-code/ContentTypes"
import { useId } from "react"
import { useViewState } from "../../pushpin-code/ViewState"
import { Popover } from "../../ui/Popover"
import { List } from "@automerge/automerge"

export interface PdfAnnotation {
  stroke: number[][]
  page: number
  authorId: DocumentId
}

export interface PdfDoc extends FileDoc {
  content: string
  annotations: PdfAnnotation[]
  regions: Region[]
  showAnnotations: boolean
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

type Rectangle = {
  from: Point
  to: Point
}

type Region = {
  rectangle: Rectangle
  page: number
  annotationUrls: PushpinUrl[]
  authorId: DocumentId
}

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

function stopPropagation(e: React.SyntheticEvent) {
  e.stopPropagation()
  e.nativeEvent.stopImmediatePropagation()
}

export default function PdfContent(props: ContentProps) {
  const [points, setPoints] = React.useState<Point[]>([])
  const [rectangle, setRectangle] = React.useState<Rectangle>()
  const [author] = useDocument<ContactDoc>(props.selfId)
  const [pageNum, setPageNum] = useViewState(props.documentId, "pageNum", 1)
  const [selectedTool, setSelectedTool] = React.useState<undefined | "marker" | "region">()

  const isMarkerSelected = selectedTool === "marker"
  const isRegionToolSelected = selectedTool === "region"
  const contextMenuId = useId()

  const handlePointerDown: PointerEventHandler<SVGSVGElement> = useCallback(
    (e: any) => {
      const bounds = e.target.getBoundingClientRect()
      const x = ((e.clientX - bounds.left) / bounds.width) * PAGE_WIDTH
      const y = ((e.clientY - bounds.top) / bounds.height) * PAGE_HEIGHT

      e.target.setPointerCapture(e.pointerId)
      e.preventDefault()

      if (isMarkerSelected) {
        setPoints([[x, y, e.pressure]])
        return
      }

      if (isRegionToolSelected) {
        setRectangle({
          from: [x, y],
          to: [x, y],
        })
        return
      }
    },
    [isMarkerSelected, isRegionToolSelected, rectangle, points]
  )

  const handlePointerMove: PointerEventHandler<SVGSVGElement> = useCallback(
    (e: any) => {
      if (e.buttons !== 1) return

      const bounds = e.target.getBoundingClientRect()
      const x = ((e.clientX - bounds.left) / bounds.width) * PAGE_WIDTH
      const y = ((e.clientY - bounds.top) / bounds.height) * PAGE_HEIGHT
      e.preventDefault()

      if (isMarkerSelected) {
        setPoints([...points, [x, y, e.pressure]])
        return
      }

      if (isRegionToolSelected && rectangle) {
        setRectangle({ ...rectangle, to: [x, y] })
        return
      }
    },
    [isMarkerSelected, isRegionToolSelected, rectangle, points]
  )

  const handlePointerUp: PointerEventHandler<SVGSVGElement> = useCallback(
    (e) => {
      e.preventDefault()

      if (isMarkerSelected && points.length !== 0) {
        changePdf((pdf) => {
          pdf.annotations.push({
            stroke: getStroke(points, STROKE_PARAMS) as unknown as List<List<number>>,
            page: pageNum,
            authorId: props.selfId,
          })
        })

        setPoints([])
        return
      }

      if (isRegionToolSelected && rectangle) {
        changePdf((pdf) => {
          pdf.regions.push({
            rectangle: rectangle as unknown as { from: List<number>; to: List<number> },
            page: pageNum,
            annotationUrls: [] as unknown as List<PushpinUrl>,
            authorId: props.selfId,
          })
        })

        setSelectedTool(undefined)
        setRectangle(undefined)
      }
    },
    [isMarkerSelected, isRegionToolSelected, rectangle, points]
  )

  const toggleIsMarkerSelected = useCallback(() => {
    setSelectedTool(isMarkerSelected ? undefined : "marker")
  }, [isMarkerSelected])

  const toggleIsRegionToolSelected = useCallback(() => {
    setSelectedTool(isRegionToolSelected ? undefined : "region")
  }, [isRegionToolSelected])

  const stroke = getStroke(points, STROKE_PARAMS)

  const pathData = getSvgPathFromStroke(stroke)

  const [pdf, changePdf] = useDocument<PdfDoc>(props.documentId)
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

  const addContentAtIndex = (index: number, type: string) => {
    ContentTypes.create(type, {}, (contentUrl) => {
      changePdf((pdf) => {
        pdf.regions[index].annotationUrls.push(contentUrl)
      })
    })
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

  const onToggleShowAnnotations = useCallback(() => {
    changePdf((pdf) => (pdf.showAnnotations = !pdf.showAnnotations))
  }, [changePdf])

  if (!pdf) {
    return null
  }

  // todo: annotationList initation shouldn't happen in view

  if (!pdf.annotations) {
    changePdf((pdf) => {
      pdf.annotations = [] as any // workaround for List<> extend types
    })
  }

  if (!pdf.regions) {
    changePdf((pdf) => {
      pdf.regions = [] as any // workaround for List<> extend types
    })
  }

  const forwardDisabled = pageNum >= numPages
  const backDisabled = pageNum <= 1

  const regionsOnPage = pdf.regions
    ? pdf.regions
        .map((region, index) => [region, index] as [Region, number])
        .filter(([region]) => region.page === pageNum)
    : []

  return (
    <div className="PdfContent">
      <div className="PdfContent-header" onDoubleClick={stopPropagation}>
        <div className="PdfContent-header-left">
          {pdf.showAnnotations && (
            <>
              <button
                disabled={forwardDisabled}
                type="button"
                onClick={toggleIsRegionToolSelected}
                className={classNames("PdfContent-button ", {
                  "is-selected": isRegionToolSelected,
                })}
              >
                <i className="fa fa-plus-square" />
              </button>
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
            </>
          )}
        </div>
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
          <Popover
            trigger={
              <button className="PdfContent-button">
                <i className="fa fa-ellipsis-h" />
              </button>
            }
            alignment="right"
          >
            <div className="PdfContent-popover">
              <label className="Popover-entry">
                <input
                  type="checkbox"
                  checked={pdf.showAnnotations}
                  onChange={onToggleShowAnnotations}
                />
                show annotations
              </label>
            </div>
          </Popover>
        </div>
      </div>

      <div className="PdfContent-main">
        <div
          className={classNames("PdfContent-document", {
            "is-tool-selected": selectedTool !== undefined,
          })}
        >
          <Document
            file={createBinaryDataUrl(pdf.binaryDataId)}
            onLoadSuccess={onDocumentLoadSuccess}
          >
            <Page
              loading=""
              pageNumber={pageNum}
              className="PdfContent-page"
              width={1600}
              renderTextLayer={false}
            />
          </Document>

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
            {pdf.annotations &&
              pdf.showAnnotations &&
              pdf.annotations.map((annotation, index) => {
                if (annotation.page !== pageNum) {
                  return
                }

                return <PdfAnnotationOverlayView key={index} annotation={annotation} />
              })}
            {pdf.showAnnotations &&
              regionsOnPage.map(([region, index], number) => {
                return <PdfRegionOverlayView region={region} number={number + 1} key={index} />
              })}

            {rectangle && (
              <rect
                x={rectangle.from[0]}
                y={rectangle.from[1]}
                width={rectangle.to[0] - rectangle.from[0]}
                height={rectangle.to[1] - rectangle.from[1]}
                stroke={author?.color ?? "#fdd835"}
                strokeWidth={3}
                fill="transparent"
              />
            )}

            {points && <path d={pathData} opacity={0.5} fill={author?.color ?? "#fdd835"} />}
          </svg>
        </div>
        {pdf.showAnnotations && (
          <div className="PdfContent-sidebar is-right">
            <div className="PdfContent-sidebarTitle">Annotations</div>
            {regionsOnPage.map(([region, index], number) => {
              return (
                <PdfRegionListItemView
                  onAddContent={(type) => addContentAtIndex(index, type)}
                  region={region}
                  number={number + 1}
                  key={index}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function PdfRegionListItemView({
  region,
  number,
  onAddContent,
}: {
  region: Region
  number: number
  onAddContent: (contentType: string) => void
}) {
  const [author] = useDocument<ContactDoc>(region.authorId)

  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const contentTypes = useMemo(() => ContentTypes.list({ context: "board" }), [])

  return (
    <div className="PdfContent-regionGroup">
      <div className="PdfContent-regionMarker" style={{ background: author?.color ?? "#fdd835" }}>
        {number}
      </div>

      {region.annotationUrls.map((contentUrl, index) => (
        <div className="PdfContent-annotationContent" key={index}>
          <Content context="board" url={contentUrl} index={index} />
        </div>
      ))}

      <ListMenuItem onClick={() => setIsMenuOpen(!isMenuOpen)}>+ Add new item</ListMenuItem>

      {isMenuOpen && (
        <ListMenuSection>
          {contentTypes.map((contentType) => (
            <ListMenuItem
              onClick={() => {
                onAddContent(contentType.type)
                setIsMenuOpen(false)
              }}
              key={contentType.type}
            >
              <div className="ContextMenu__iconBounding ContextMenu__iconBounding--note">
                <i className={classNames("fa", `fa-${contentType.icon}`)} />
              </div>
              <span className="ContextMenu__label">{contentType.name}</span>
            </ListMenuItem>
          ))}
        </ListMenuSection>
      )}
    </div>
  )
}

function PdfRegionOverlayView({ region, number }: { region: Region; number: number }) {
  const [author] = useDocument<ContactDoc>(region.authorId)

  const { rectangle } = region

  const width = rectangle.to[0] - rectangle.from[0]
  const height = rectangle.to[1] - rectangle.from[1]

  return (
    <g transform={`translate(${rectangle.from[0]}, ${rectangle.from[1]})`}>
      <rect
        className="PdfContent-region"
        width={width}
        height={height}
        stroke={author?.color ?? "#fdd835"}
        strokeWidth={5}
        fill="transparent"
      />
      <g transform={`translate(${width}, ${height})`}>
        <circle fill={author?.color ?? "#fdd835"} x={-20} y={-20} r={20}></circle>
        <text
          fill="white"
          x={0}
          y={1}
          alignmentBaseline="middle"
          textAnchor="middle"
          style={{
            fontWeight: "bold",
            fontSize: "24px",
            fontFamily: "sans-serif",
          }}
        >
          {number}
        </text>
      </g>
    </g>
  )
}

function PdfAnnotationOverlayView({ annotation }: { annotation: PdfAnnotation }) {
  const [author] = useDocument<ContactDoc>(annotation.authorId)

  const pathData = getSvgPathFromStroke(annotation.stroke)

  return <path d={pathData} opacity={0.5} fill={author?.color ?? "#fdd835"} />
}

const supportsMimeType = (mimeType: string) => !!mimeType.match("application/pdf")

export const contentType: ContentType = {
  type: "pdf",
  name: "PDF",
  icon: "file-pdf-o",
  unlisted: true,
  contexts: {
    expanded: PdfContent,
    board: PdfContent,
  },
  supportsMimeType,
}

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
