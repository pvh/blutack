import React from 'react'
import { Doc } from 'hypermerge'
import { parseDocumentLink, PushpinUrl } from '../../pushpin-code/ShareLink'
import * as ContentTypes from '../../pushpin-code/ContentTypes'
import Badge from '../../ui/Badge'
import { useDocument } from 'automerge-repo-react-hooks'
import ContentDragHandle from '../../ui/ContentDragHandle'

interface Props {
  url: PushpinUrl
  context: ContentTypes.Context
}

export default (props: Props) => {
  const { url, context } = props
  const { type, hypermergeUrl } = parseDocumentLink(url)
  const [doc] = useDocument<Doc<{ backgroundColor?: string }>>(hypermergeUrl)

  if (!doc) {
    return null
  }

  const contentType = ContentTypes.lookup({ type, context })

  const icon = contentType ? contentType.icon : 'exclamation-triangle'

  return (
    <ContentDragHandle url={url}>
      <Badge icon={icon} backgroundColor={doc.backgroundColor} />
    </ContentDragHandle>
  )
}
