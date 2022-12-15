import React from "react"
import * as ContentTypes from "../../pushpin-code/ContentTypes"
import { ContentProps } from "../../Content"
import Badge from "../../ui/Badge"
import ContentDragHandle from "../../ui/ContentDragHandle"
import { useDocument } from "automerge-repo-react-hooks"
import { useLastSeenHeads } from "../../pushpin-code/Changes"
import { createDocumentLink } from "../../pushpin-code/Url"
import { HasBadge } from "../../../lenses/HasBadge"
import { readWithSchema } from "../../../lenses"

interface Doc {
  title?: string
}

export default function DefaultInBadge(props: ContentProps) {
  const { url, documentId } = props
  const [rawDoc] = useDocument<Doc>(documentId)
  const { type } = props
  const contentType = ContentTypes.lookup({ type, context: "list" })
  const lastSeenHeads = useLastSeenHeads(createDocumentLink(type, documentId))

  if (!rawDoc) {
    return null
  }

  const { icon = "question", name = `Unidentified type: ${type}` } =
    contentType || {}

  const { unseenChanges, badgeColor } = readWithSchema({
    doc: rawDoc,
    type,
    lastSeenHeads,
    schema: "HasBadge",
  }) as HasBadge

  return (
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
  )
}

ContentTypes.registerDefault({
  component: DefaultInBadge,
  context: "badge",
})
