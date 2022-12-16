import React from "react"
import * as ContentTypes from "../../pushpin-code/ContentTypes"
import { ContentProps } from "../../Content"
import TitleWithSubtitle from "../../ui/TitleWithSubtitle"
import { useDocument } from "automerge-repo-react-hooks"
import { useLastSeenHeads } from "../../pushpin-code/Changes"
import { createDocumentLink } from "../../pushpin-code/Url"
import { readWithSchema } from "../../../lenses"
import { HasTitle } from "../../../lenses/HasTitle"

export default function DefaultInTitle(props: ContentProps) {
  const { documentId } = props
  const [rawDoc] = useDocument<any>(documentId)
  const { type } = props
  const lastSeenHeads = useLastSeenHeads(createDocumentLink(type, documentId))

  if (!rawDoc) {
    return null
  }

  const doc = readWithSchema({
    doc: rawDoc,
    type,
    lastSeenHeads,
    schema: "HasTitle",
  }) as HasTitle

  return (
    <TitleWithSubtitle
      title={doc.title}
      titleEditorField={doc.titleEditorField ?? ""}
      subtitle={doc.subtitle}
      documentId={documentId}
      editable={doc.titleEditorField !== null}
    />
  )
}

ContentTypes.registerDefault({
  component: DefaultInTitle,
  context: "title",
})
