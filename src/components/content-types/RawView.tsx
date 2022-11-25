import React from "react"

import * as ContentTypes from "../pushpin-code/ContentTypes"
import { useDocument } from "automerge-repo-react-hooks"
import "./TextContent.css"
import Badge from "../ui/Badge"
import ListItem from "../ui/ListItem"
import ContentDragHandle from "../ui/ContentDragHandle"
import TitleWithSubtitle from "../ui/TitleWithSubtitle"
import { DocumentWithTitle } from "./workspace/Workspace"
import { ContentProps, EditableContentProps } from "../Content"
import "./RawView.css"

export default function RawView(props: ContentProps) {
  const [doc] = useDocument(props.documentId)

  return <pre className="RawView">{JSON.stringify(doc, null, 2)}</pre>
}

function JsonInList(props: EditableContentProps) {
  const { documentId, url, editable } = props
  const [doc] = useDocument<DocumentWithTitle>(documentId)
  if (!doc) return null

  const title = doc.title || documentId

  return (
    <ListItem>
      <ContentDragHandle url={url}>
        <Badge icon="file-code" size="medium" />
      </ContentDragHandle>
      <TitleWithSubtitle
        title={title}
        documentId={documentId}
        editable={editable}
      />
    </ListItem>
  )
}

ContentTypes.register({
  unlisted: true,
  type: "raw",
  name: "Raw",
  icon: "file-code",
  contexts: {
    workspace: RawView,
    board: RawView,
    list: JsonInList,
    "title-bar": JsonInList,
  },
})
