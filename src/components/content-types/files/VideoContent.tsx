import React from 'react'

import { FileDoc } from '.'
import { ContentProps } from '../../Content'
import * as ContentTypes from '../../pushpin-code/ContentTypes'
import { useDocument } from 'automerge-repo-react-hooks'
import './VideoContent.css'
import { createBinaryDataUrl } from '../../../blobstore/Blob'

export default function VideoContent({ documentId }: ContentProps) {
  const [doc] = useDocument<FileDoc>(documentId)

  if (!(doc && doc.binaryDataId)) {
    return null
  }

  return <video className="VideoContent" controls src={createBinaryDataUrl(doc.binaryDataId)} />
}

const supportsMimeType = (mimeType: string) =>
  !!(mimeType.match('video/') || mimeType.match('application/ogg'))

ContentTypes.register({
  type: 'video',
  name: 'Video',
  icon: 'file-video-o',
  unlisted: true,
  contexts: {
    workspace: VideoContent,
    board: VideoContent,
  },
  supportsMimeType,
})
