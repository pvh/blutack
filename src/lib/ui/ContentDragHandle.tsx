import React, { ReactNode, useRef } from "react"
import "./Heading.css"
import mime from "mime-types"
import * as UriList from "../blutack/UriList"
import "./ContentDragHandle.css"
import { PushpinUrl } from "../blutack/Url"
import { DocumentId } from "automerge-repo"
import { BinaryDataId, useBinaryDataHeader } from "../blutack/Blob"

interface SimpleProps {
  url: PushpinUrl
  children: ReactNode
}
interface FileProps extends SimpleProps {
  filename: string
  extension?: string
  binaryDataId: BinaryDataId
}

export type Props = SimpleProps | FileProps

export default function ContentDragHandle(props: Props) {
  const { url, children } = props
  const ref = useRef<HTMLSpanElement>(null)
  const binaryDataId = "binaryDataId" in props ? props.binaryDataId : undefined
  const header = useBinaryDataHeader(binaryDataId)

  const onDragStart = (event: React.DragEvent<HTMLSpanElement>) => {
    if (ref.current) {
      event.dataTransfer.setDragImage(ref.current, 0, 0)
    }

    event.dataTransfer.setData(UriList.MIME_TYPE, url)

    // and we'll add a DownloadURL if we need to
    if ("binaryDataId" in props && header) {
      const { binaryDataId, filename, extension } = props
      const { mimeType } = header

      const outputExtension = extension || mime.extension(mimeType || "") || ""

      const downloadUrl = `text:${filename}.${outputExtension}:${binaryDataId}`
      event.dataTransfer.setData("DownloadURL", downloadUrl)
    }
  }

  return (
    <span draggable ref={ref} onDragStart={onDragStart} className="ContentDragHandle">
      {children}
    </span>
  )
}
