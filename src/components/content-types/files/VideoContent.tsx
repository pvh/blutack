import React from "react"

import { FileDoc } from "."
import { ContentProps } from "../../Content"
import * as ContentTypes from "../../pushpin-code/ContentTypes"
import { useDocument } from "automerge-repo-react-hooks"
import "./VideoContent.css"
import { createBinaryDataUrl } from "../../../blobstore/Blob"
import { ContentType } from "../../pushpin-code/ContentTypes"

export default function VideoContent({ documentId }: ContentProps) {
  const [doc] = useDocument<FileDoc>(documentId)

  if (!(doc && doc.binaryDataId)) {
    return null
  }

  return (
    <video
      className="VideoContent"
      controls
      src={createBinaryDataUrl(doc.binaryDataId)}
    />
  )
}

const supportsMimeType = (mimeType: string) =>
  !!(mimeType.match("video/") || mimeType.match("application/ogg"))

export const videoContentType: ContentType = {
  type: "video",
  name: "Video",
  icon: "file-video-o",
  unlisted: true,
  contexts: {
    expanded: VideoContent,
    board: VideoContent,
  },
  supportsMimeType,
}
