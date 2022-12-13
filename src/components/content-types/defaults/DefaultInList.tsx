import React from "react"
import * as ContentTypes from "../../pushpin-code/ContentTypes"
import { ContentProps } from "../../Content"
import Badge from "../../ui/Badge"
import ContentDragHandle from "../../ui/ContentDragHandle"
import TitleWithSubtitle from "../../ui/TitleWithSubtitle"
import ListItem from "../../ui/ListItem"
import { useDocument } from "automerge-repo-react-hooks"
import { docToListItem } from "../../../lenses/ListItem"

interface Doc {
  title?: string
}

export default function DefaultInList(props: ContentProps) {
  const { url, documentId } = props
  const [doc] = useDocument<Doc>(documentId)

  if (!doc) {
    return null
  }

  const { type } = props
  const contentType = ContentTypes.lookup({ type, context: "list" })

  const { icon = "question", name = `Unidentified type: ${type}` } =
    contentType || {}

  const listItem = docToListItem(doc, type)

  console.log({ listItem })

  return (
    <ListItem>
      <ContentDragHandle url={url}>
        <Badge icon={icon} />
      </ContentDragHandle>
      <TitleWithSubtitle
        title={listItem.title}
        titleEditorField={listItem.titleEditorField ?? ""}
        documentId={documentId}
        editable={listItem.titleEditorField !== null}
      />
    </ListItem>
  )
}

console.log("registering default")

ContentTypes.registerDefault({
  component: ListItem,
  context: "list",
})
