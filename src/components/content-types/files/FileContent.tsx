import React, { useRef } from 'react'
import Content, { ContentProps } from '../../Content'
import * as ContentTypes from '../../pushpin-code/ContentTypes'
import { useDocument } from 'automerge-repo-react-hooks'
import { createDocumentLink } from '../../pushpin-code/ShareLink'
import { FileDoc } from '.'

import './FileContent.css'
import Badge from '../../ui/Badge'
import ListItem from '../../ui/ListItem'
import ContentDragHandle from '../../ui/ContentDragHandle'
import TitleWithSubtitle from '../../ui/TitleWithSubtitle'
import CenteredStack from '../../ui/CenteredStack'
import SecondaryText from '../../ui/SecondaryText'
import Heading from '../../ui/Heading'
import { useBinaryDataHeader } from '../../../blobstore/Blob'

function humanFileSize(size: number) {
  const i = size ? Math.floor(Math.log(size) / Math.log(1024)) : 0
  return `${(size / 1024 ** i).toFixed(1)} ${['B', 'kB', 'MB', 'GB', 'TB'][i]}`
}

interface Props extends ContentProps {
  editable: boolean
}

/*
VVV editable VVV
{ name: "Malleable Software (Tchernowski)",
  created: Date.now(),
  creator: <Paul's contactID>
  fileId: <pointertoFileId>
}

VVV permanent and unchanging (and required to render) VVV
fileId: { "mimetype": "binary/pdf", length: 8000, "extension": "PDF"}
*/

export default function FileContent({ documentId, context, editable, url }: Props) {
  const [doc] = useDocument<FileDoc>(documentId)
  const badgeRef = useRef<HTMLDivElement>(null)

  const { title = '', extension, binaryDataId } = doc || {}

  const header = useBinaryDataHeader(binaryDataId)

  if (!binaryDataId || !header) {
    return null
  }
  const { size, mimeType } = header

  const subtitle = `${size !== null ? humanFileSize(size) : 'unknown size'}`

  function renderUnidentifiedFile() {
    switch (context) {
      case 'list':
      case 'title-bar':
        return (
          <ListItem>
            <ContentDragHandle
              url={url}
              filename={title}
              extension={extension}
              binaryDataId={binaryDataId}
            >
              <Badge shape="square" icon="file-o" />
            </ContentDragHandle>
            <TitleWithSubtitle
              title={title}
              subtitle={subtitle}
              documentId={documentId}
              editable={editable}
            />
          </ListItem>
        )
      default:
        return (
          <CenteredStack>
            <Badge ref={badgeRef} size="huge" shape="square" icon="file-o" />
            <Heading>{title}</Heading>
            <SecondaryText>{subtitle}</SecondaryText>
          </CenteredStack>
        )
    }
  }

  const contentType = ContentTypes.mimeTypeToContentType(mimeType)
  const contextRenderer = contentType.contexts[context]

  if (contentType.type !== 'file' && contextRenderer) {
    return (
      <Content
        context={context}
        editable={editable}
        url={createDocumentLink(contentType.type, documentId)}
      />
    )
  }

  return renderUnidentifiedFile()
}

FileContent.minWidth = 6
FileContent.minHeight = 6
FileContent.defaultWidth = 18
FileContent.maxWidth = 72
FileContent.maxHeight = 72
