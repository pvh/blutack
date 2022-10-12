import React, { useState, useCallback, useEffect } from 'react'

import { Document, Page, pdfjs } from 'react-pdf'

// TODO: see if we can find a better way to load this file;
// some ideas: https://github.com/wojtekmaj/react-pdf/issues/97
pdfjs.GlobalWorkerOptions.workerSrc = `/src/assets/pdf.worker.js`;

import { useDocument } from 'automerge-repo-react-hooks'
import { FileDoc } from '.'

import * as ContentTypes from '../../pushpin-code/ContentTypes'
import { ContentProps } from '../../Content'
import './PdfContent.css'
import { useBinaryDataContents, useBinaryDataHeader } from '../../../blobstore/Blob'
import { useConfirmableInput } from '../../pushpin-code/Hooks'
import { streamToBuffer } from '../../pushpin-code/ContentData'

interface PdfDoc extends FileDoc {
  content: string
}

export default function PdfContent(props: ContentProps) {

  const [pdf, changePdf] = useDocument<PdfDoc>(props.documentId)
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

   if (!pdf) {
     return null
   }

  const { context } = props
  
  const forwardDisabled = pageNum >= numPages
  const backDisabled = pageNum <= 1

  const header =
    context === 'workspace' ? (
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
    ) : null

  return (
    <>
      {header}
      {buffer ? (
        <Document file={{ data: buffer }} onLoadSuccess={onDocumentLoadSuccess}>
          <Page
            loading=""
            pageNumber={pageNum}
            className="PdfContent-page"
            width={1600}
            renderTextLayer={false}
          />
        </Document>
      ) : null}
    </>
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


