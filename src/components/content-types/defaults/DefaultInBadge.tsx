import React from "react"
import * as ContentTypes from "../../../lib/blutack/ContentTypes"
import { ContentProps } from "../../../lib/blutack/Content"
import Badge from "../../../lib/ui/Badge"
import ContentDragHandle from "../../../lib/ui/ContentDragHandle"
import { useDocument } from "automerge-repo-react-hooks"
import { useLastSeenHeads } from "../../../lib/blutack/Changes"
import { createDocumentLink } from "../../../lib/blutack/Url"
import { HasBadge } from "../../../lenses/HasBadge"
import { readWithSchema } from "../../../lenses"
import { useSelf, useSelfId } from "../../../lib/blutack/SelfHooks"

interface Doc {
  title?: string
}

export default function DefaultInBadge(props: ContentProps) {
  const { url, documentId } = props
  const [rawDoc] = useDocument<Doc>(documentId)
  const { type } = props
  const contentType = ContentTypes.lookup({ type, context: "badge" })
  const lastSeenHeads = useLastSeenHeads(createDocumentLink(type, documentId))
  const selfId = useSelfId()
  const [self] = useSelf()

  if (!rawDoc || !self) {
    return null
  }

  const { icon = "question", name = `Unidentified type: ${type}` } = contentType || {}

  const { unseenChanges, badgeColor, notify } = readWithSchema({
    doc: rawDoc,
    type,
    schema: "HasBadge",
    props: {
      lastSeenHeads,
      selfId: selfId,
      selfName: self.name,
    },
  }) as HasBadge

  return (
    <ContentDragHandle url={url}>
      <Badge
        icon={icon}
        backgroundColor={badgeColor}
        dot={
          notify && unseenChanges.changes
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
