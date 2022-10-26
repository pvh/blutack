import React, { useCallback } from "react"

import * as ContentTypes from "../pushpin-code/ContentTypes"
import Content, { ContentProps, EditableContentProps } from "../Content"
import {
  createDocumentLink,
  createWebLink,
  parseDocumentLink,
  PushpinUrl,
} from "../pushpin-code/ShareLink"
import ListItem from "../ui/ListItem"
import Badge from "../ui/Badge"
import ContentDragHandle from "../ui/ContentDragHandle"
import TitleWithSubtitle from "../ui/TitleWithSubtitle"
import "./FeedbackParser.css"
import { useDocument, useRepo } from "automerge-repo-react-hooks"

import { DocHandle, DocumentId } from "automerge-repo"
import * as ImportData from "../pushpin-code/ImportData"
import CenteredStack from "../ui/CenteredStack"
import Heading from "../ui/Heading"
import { TextDoc } from "./TextContent"

type FeedbackType = "compliment" | "suggestion" | "question"

interface FeedbackItem {
  summary: string
  excerpt: string
  _type: FeedbackType
}

interface Doc {
  /* TODO: we use this "doc type" to signal that a bot should act on this doc;
     but seems like we'd want something more like polymorphic cambria schemas? */
  _type: "FeedbackParser"
  title?: string
  textDocId?: DocumentId

  /* HACK: a copy of the text from the linked doc.
     remove once we figure out how to resolve linked docs in the server-side thing */
  text?: string

  feedbackItems: FeedbackItem[]

  /* A signaling value used to ask an AI agent to parse the feedback
     TODO: this feels pretty low level; how can we make this feel nicer?
     And how can we colocate the AI logic closer to here even if it will
     ultimately run elsewhere. */
  _requestParse: boolean
}

FeedbackParser.minWidth = 9
FeedbackParser.minHeight = 6
FeedbackParser.defaultWidth = 16
FeedbackParser.defaultHeight = 18
FeedbackParser.maxWidth = 24
FeedbackParser.maxHeight = 36

export default function FeedbackParser(props: ContentProps) {
  const repo = useRepo()
  const [doc, changeDoc] = useDocument<Doc>(props.documentId)

  const setTextDocId = (url: PushpinUrl) => {
    const docId = parseDocumentLink(url)["documentId"]
    const text = (repo.find(docId).doc as TextDoc).text.toString()
    changeDoc((doc) => {
      doc.textDocId = docId
      doc.text = text
      doc.feedbackItems = []
      doc._requestParse = true
    })
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()

    ImportData.importDataTransfer(e.dataTransfer, (url) => {
      setTextDocId(url)
    })
  }, [])

  if (!doc) {
    return null
  }

  return (
    <div className="FeedbackParser">
      <div className="FeedbackParser--tool-heading">
        <Heading>🪄 Magic Feedback Parser</Heading>
      </div>
      <div
        className="FeedbackParser--doc"
        onDrop={onDrop}
        onDragOver={preventDefault}
        onDragEnter={preventDefault}
      >
        {doc.textDocId ? (
          <Content
            context="workspace"
            url={createDocumentLink("text", doc.textDocId)}
          />
        ) : (
          <div>Drop a text document here</div>
        )}
      </div>
      <div className="FeedbackParser--suggestions">
        {/* Show a message when the list is empty */}
        {doc.feedbackItems.length === 0 && (
          <div className="FeedbackParser--empty-list-message">
            Processing...
          </div>
        )}

        <Heading>👍 Compliments</Heading>

        <div className="FeedbackParser--feedback-category">
          {doc.feedbackItems
            .filter((item) => item._type === "compliment")
            .map((item) => (
              <div className="FeedbackParser--feedback-item">
                <div>
                  <strong>{item.summary}</strong>
                </div>{" "}
                {item.excerpt}
              </div>
            ))}
        </div>

        <div className="FeedbackParser--feedback-category">
          <Heading>💬 Suggestions</Heading>

          {doc.feedbackItems
            .filter((item) => item._type === "suggestion")
            .map((item) => (
              <div className="FeedbackParser--feedback-item">
                <div>
                  <strong>{item.summary}</strong>
                </div>
                {item.excerpt}
              </div>
            ))}
        </div>

        <div className="FeedbackParser--feedback-category">
          <Heading>❓ Questions</Heading>

          {doc.feedbackItems
            .filter((item) => item._type === "question")
            .map((item) => (
              <div className="FeedbackParser--feedback-item">
                <div>
                  <strong>{item.summary}</strong>
                </div>{" "}
                {item.excerpt}
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

function preventDefault(e: React.SyntheticEvent) {
  e.preventDefault()
}

function create(unusedAttrs: any, handle: DocHandle<any>) {
  handle.change((doc: Doc) => {
    doc._type = "FeedbackParser"
    doc.feedbackItems = []
    doc._requestParse = false
  })
}

export function FeedbackParserInList(props: EditableContentProps) {
  const { documentId, url, editable } = props
  const [doc] = useDocument<Doc>(documentId)
  if (!doc) return null

  // TODO: use the title of the text doc as the title here?
  const title =
    doc.title != null && doc.title !== "" ? doc.title : "Untitled feedback"

  return (
    <ListItem>
      <ContentDragHandle url={url}>
        <Badge size="medium" icon={icon} />
      </ContentDragHandle>
      <TitleWithSubtitle
        titleEditorField="title"
        title={title}
        documentId={documentId}
        editable={editable}
      />
    </ListItem>
  )
}

const icon = "comments"

ContentTypes.register({
  type: "feedback-parser",
  name: "Feedback Parser",
  icon,
  contexts: {
    workspace: FeedbackParser,
    board: FeedbackParser,
    list: FeedbackParserInList,
    "title-bar": FeedbackParserInList,
  },
  create,
})
