import React from "react"
import * as ContentTypes from "../../pushpin-code/ContentTypes"
import { ContentProps } from "../../Content"
import Badge from "../../ui/Badge"
import ContentDragHandle from "../../ui/ContentDragHandle"
import TitleWithSubtitle from "../../ui/TitleWithSubtitle"
import ListItem from "../../ui/ListItem"
import { useDocument } from "automerge-repo-react-hooks"
import { docToListItem } from "../../../lenses/ListItem"
import { useLastSeenHeads } from "../../pushpin-code/Changes"
import { createDocumentLink } from "../../pushpin-code/Url"

interface Doc {
  title?: string
}

export default function DefaultInList(props: ContentProps) {
  const { url, documentId } = props
  const [doc] = useDocument<Doc>(documentId)
  const { type } = props
  const contentType = ContentTypes.lookup({ type, context: "list" })
  const lastSeenHeads = useLastSeenHeads(createDocumentLink(type, documentId))

  if (!doc) {
    return null
  }

  const { icon = "question", name = `Unidentified type: ${type}` } =
    contentType || {}

  const { title, titleEditorField, subtitle, unseenChanges, badgeColor } =
    docToListItem(doc, type, lastSeenHeads)

  return (
    <ListItem>
      <ContentDragHandle url={url}>
        <Badge
          icon={icon}
          backgroundColor={badgeColor}
          dot={
            unseenChanges.changes
              ? {
                  color: "var(--colorChangeDot)",
                  number: unseenChanges.count,
                }
              : undefined
          }
        />
      </ContentDragHandle>
      <TitleWithSubtitle
        title={title}
        titleEditorField={titleEditorField ?? ""}
        subtitle={subtitle}
        documentId={documentId}
        editable={titleEditorField !== null}
      />
    </ListItem>
  )
}

console.log("registering default")

ContentTypes.registerDefault({
  component: DefaultInList,
  context: "list",
})

ContentTypes.registerDefault({
  component: DefaultInList,
  context: "title-bar",
})
