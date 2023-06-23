import React from "react"
import { parseDocumentLink, PushpinUrl } from "../../../bootstrap/lib/blutack/Url"
import * as ContentTypes from "../../../bootstrap/lib/blutack/ContentTypes"
import Badge from "../../../bootstrap/lib/ui/Badge"
import { useDocument } from "automerge-repo-react-hooks"
import ContentDragHandle from "../../../bootstrap/lib/ui/ContentDragHandle"

interface Props {
  url: PushpinUrl
  context: ContentTypes.Context
}

export default (props: Props) => {
  const { url, context } = props
  const { type, documentId } = parseDocumentLink(url)
  const [doc] = useDocument<{ backgroundColor?: string }>(documentId)

  if (!doc) {
    return null
  }

  const contentType = ContentTypes.lookup({ type, context })

  const icon = contentType ? contentType.icon : "exclamation-triangle"

  return (
    <ContentDragHandle url={url}>
      <Badge icon={icon} backgroundColor={doc.backgroundColor} />
    </ContentDragHandle>
  )
}
