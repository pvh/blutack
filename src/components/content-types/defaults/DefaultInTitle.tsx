import React from "react"
import * as ContentTypes from "../../../bootstrap/lib/blutack/ContentTypes"
import { ContentProps } from "../../../bootstrap/lib/blutack/Content"
import TitleWithSubtitle from "../../../bootstrap/lib/ui/TitleWithSubtitle"
import { useDocument } from "automerge-repo-react-hooks"
import { useLastSeenHeads } from "../../../bootstrap/lib/blutack/Changes"
import { createDocumentLink } from "../../../bootstrap/lib/blutack/Url"
import { readWithSchema } from "../../../lenses"
import { HasTitle } from "../../../lenses/HasTitle"
import { HasBadge } from "../../../lenses/HasBadge"
import { useSelf, useSelfId } from "../../../bootstrap/lib/blutack/SelfHooks"

export default function DefaultInTitle(props: ContentProps) {
  const { documentId } = props
  const [rawDoc] = useDocument<any>(documentId)
  const { type } = props
  const lastSeenHeads = useLastSeenHeads(createDocumentLink(type, documentId))
  const selfId = useSelfId()
  const [self] = useSelf()

  if (!rawDoc || !self) {
    return null
  }

  const docWithTitle = readWithSchema({
    doc: rawDoc,
    type,
    schema: "HasTitle",
    props: {},
  }) as HasTitle

  const docWithBadge = readWithSchema({
    doc: rawDoc,
    type,
    schema: "HasBadge",
    props: {
      lastSeenHeads,
      selfId,
      selfName: self.name,
    },
  }) as HasBadge

  return (
    <TitleWithSubtitle
      bold={docWithBadge.unseenChanges.changes}
      title={docWithTitle.title}
      titleEditorField={docWithTitle.titleEditorField ?? ""}
      subtitle={docWithTitle.subtitle}
      documentId={documentId}
      editable={docWithTitle.titleEditorField !== null}
    />
  )
}

ContentTypes.registerDefault({
  component: DefaultInTitle,
  context: "title",
})
