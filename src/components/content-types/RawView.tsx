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
import {
  createDocumentLink,
  createWebLink,
  isPushpinUrl,
} from "../pushpin-code/Url"
import { DocumentId } from "../../../../automerge-repo"

export default function RawView(props: ContentProps) {
  const [doc] = useDocument(props.documentId)

  const jsonString = JSON.stringify(
    doc,
    (key, value) => {
      if (typeof value !== "string") {
        return value
      }

      if (isPushpinUrl(value)) {
        return `<a href=${createWebLink(window.location, value)}>${value}</a>`
      }

      if (isDocumentId(value)) {
        const href = createWebLink(
          window.location,
          createDocumentLink("raw", value as DocumentId)
        )

        return `<a href=${href}>${value}</a>`
      }

      return value
    },
    2
  )

  return (
    <pre
      className="RawView"
      dangerouslySetInnerHTML={{ __html: jsonString }}
    ></pre>
  )
}

function isDocumentId(value: any) {
  return /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/.test(
    value
  )
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
