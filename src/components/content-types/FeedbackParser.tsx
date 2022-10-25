import React, { useCallback } from "react"

import * as ContentTypes from "../pushpin-code/ContentTypes"
import Content, { ContentProps, EditableContentProps } from "../Content"
import { PushpinUrl } from "../pushpin-code/ShareLink"
import ListItem from "../ui/ListItem"
import Badge from "../ui/Badge"
import ContentDragHandle from "../ui/ContentDragHandle"
import TitleWithSubtitle from "../ui/TitleWithSubtitle"
import "./FeedbackParser.css"
import { useDocument } from "automerge-repo-react-hooks"

import { DocHandle } from "automerge-repo"
import * as ImportData from "../pushpin-code/ImportData"
import CenteredStack from "../ui/CenteredStack"
import Heading from "../ui/Heading"

type FeedbackType = "positive" | "suggestion"

interface FeedbackItem {
  text: string
  originalTextDocUrl: PushpinUrl
  type: FeedbackType
}

interface Doc {
  title?: string
  textDocUrl?: PushpinUrl
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
  const [doc, changeDoc] = useDocument<Doc>(props.documentId)

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()

    ImportData.importDataTransfer(e.dataTransfer, (url) => {
      changeDoc((doc: Doc) => {
        doc.textDocUrl = url
      })
    })
  }, [])

  if (!doc) {
    return null
  }

  return (
    <CenteredStack direction="column" centerText={false}>
      <div className="FeedbackParser--tool-heading">
        <Heading>🪄 Magic Feedback Parser</Heading>
      </div>
      <div
        className="FeedbackParser--doc"
        onDrop={onDrop}
        onDragOver={preventDefault}
        onDragEnter={preventDefault}
      >
        {doc.textDocUrl ? (
          <Content context="workspace" url={doc.textDocUrl} />
        ) : (
          <div>Drop a text document here</div>
        )}
      </div>
      <div className="FeedbackParser--suggestions">
        <button onClick={() => changeDoc((d) => (d._requestParse = true))}>
          Refresh suggestions
        </button>
        {/* Show a message when the list is empty */}
        {doc.feedbackItems.length === 0 && (
          <div className="FeedbackParser--empty-list-message">
            No feedback items yet
          </div>
        )}
        {doc.feedbackItems.map((item) => (
          <div>{item.text}</div>
        ))}
      </div>
    </CenteredStack>
  )
}

function preventDefault(e: React.SyntheticEvent) {
  e.preventDefault()
}

function create(unusedAttrs: any, handle: DocHandle<any>) {
  handle.change((doc) => {
    doc.feedbackItems = []
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
