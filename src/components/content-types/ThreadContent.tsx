import React, { useCallback, useId, useRef, useState } from "react"

import * as ContentTypes from "../pushpin-code/ContentTypes"
import Content, { ContentProps, EditableContentProps } from "../Content"
import { createDocumentLink, isPushpinUrl } from "../pushpin-code/Url"
import ListItem from "../ui/ListItem"
import Badge from "../ui/Badge"
import ContentDragHandle from "../ui/ContentDragHandle"
import TitleWithSubtitle from "../ui/TitleWithSubtitle"
import "./ThreadContent.css"
import { DocumentId } from "automerge-repo"
import { useDocument } from "automerge-repo-react-hooks"

import { DocHandle } from "automerge-repo"
import { MIMETYPE_CONTENT_LIST_INDEX } from "../constants"
import * as ImportData from "../pushpin-code/ImportData"
import { openDoc } from "../pushpin-code/Url"
import {
  getUnseenPatches,
  LastSeenHeads,
  useAutoAdvanceLastSeenHeads,
  useLastSeenHeads,
} from "../pushpin-code/Changes"
import { Doc, Text } from "@automerge/automerge"
import { evalSearchFor, MENTION } from "../pushpin-code/Searches"
import { useSelf } from "../pushpin-code/SelfHooks"
import { shouldNotifyAboutDocChanges } from "./workspace/NotificationSetting"
import { useQuill } from "./TextContent"
import { useStaticCallback } from "../pushpin-code/Hooks"

interface Message {
  authorId: DocumentId
  content: string
  time: number // Unix timestamp
}

export interface ThreadDoc {
  title?: string
  messages: Message[]
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  localeMatcher: "best fit",
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
  month: "numeric",
  day: "numeric",
})

ThreadContent.minWidth = 9
ThreadContent.minHeight = 6
ThreadContent.defaultWidth = 16
ThreadContent.defaultHeight = 18
ThreadContent.maxWidth = 24
ThreadContent.maxHeight = 36

export default function ThreadContent(props: ContentProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [doc, changeDoc] = useDocument<ThreadDoc>(props.documentId)
  useAutoAdvanceLastSeenHeads(createDocumentLink("thread", props.documentId))

  const onDrop = useCallback((e: React.DragEvent) => {
    ImportData.importDataTransfer(e.dataTransfer, (url) => {
      if (url == props.url) {
        return
      }

      e.preventDefault()
      changeDoc((threadDoc: ThreadDoc) => {
        threadDoc.messages.push({
          authorId: props.selfId,
          content: url,
          time: new Date().getTime(),
        })
      })
    })
  }, [])

  const onEnterKey = useStaticCallback(() => {
    if (!quill.current) {
      return
    }

    const content = quill.current.getText().toString()

    changeDoc((threadDoc: ThreadDoc) => {
      threadDoc.messages.push({
        authorId: props.selfId,
        content,
        time: new Date().getTime(),
      })
    })

    quill.current.deleteText(0, quill.current.getText().length)
  })

  const [ref, quill] = useQuill({
    text: new Text(""),
    config: {
      formats: ["bold", "color", "italic"],
      modules: {
        mention: {},
        cursors: {
          hideDelayMs: 500,
          transformOnTextChange: true,
        },
        toolbar: false,
        history: {
          maxStack: 500,
          userOnly: true,
        },
        clipboard: {
          disableFormattingOnPaste: true,
        },
        keyboard: {
          bindings: {
            enter: {
              key: 13,
              shiftKey: false,
              handler: onEnterKey,
            },
          },
        },
      },
    },
  })

  if (!doc || !doc.messages) {
    return null
  }

  const { messages } = doc
  const groupedMessages = groupBy(messages, "authorId")

  return (
    <div
      className="threadWrapper"
      onDrop={onDrop}
      onDragOver={preventDefault}
      onDragEnter={preventDefault}
    >
      <div className="messageWrapper">
        <div className="messages" onScroll={stopPropagation}>
          {groupedMessages.map(renderGroupedMessages)}
        </div>
      </div>
      <div
        className="inputWrapper"
        onClick={() => quill.current?.focus()}
        ref={containerRef}
      >
        <div
          ref={ref}
          onClick={stopPropagation}
          onCopy={stopPropagation}
          onCut={stopPropagation}
          onPaste={stopPropagation}
          onDoubleClick={stopPropagation}
        />
      </div>
    </div>
  )
}

function preventDefault(e: React.SyntheticEvent) {
  e.preventDefault()
}

export function ThreadInList(props: EditableContentProps) {
  const { documentId, url, editable, selfId } = props
  const [doc] = useDocument<ThreadDoc>(documentId)
  const [self] = useSelf()
  const lastSeenHeads = useLastSeenHeads(
    createDocumentLink("thread", documentId)
  )

  if (!doc || !doc.messages || !self) return null

  const unseenChanges = hasUnseenChanges(doc, lastSeenHeads)
  const showChangedDot = shouldNotifyAboutDocChanges(
    "thread",
    doc,
    lastSeenHeads,
    selfId,
    self.name
  )

  const title =
    doc.title != null && doc.title !== "" ? doc.title : "Untitled conversation"

  return (
    <ListItem>
      <ContentDragHandle url={url}>
        <Badge
          size="medium"
          icon={icon}
          dot={showChangedDot ? { color: "var(--colorChangeDot)" } : undefined}
        />
      </ContentDragHandle>
      <TitleWithSubtitle
        bold={unseenChanges}
        titleEditorField="title"
        title={title}
        documentId={documentId}
        editable={editable}
      />
    </ListItem>
  )
}

export function hasUnseenChanges(
  doc: Doc<unknown>,
  lastSeenHeads?: LastSeenHeads
) {
  // TODO: one of these days we should figure out the typing
  return getUnseenPatches(doc as ThreadDoc, lastSeenHeads).some(
    (patch) =>
      patch.action === "splice" &&
      patch.path.length === 2 &&
      patch.path[0] === "messages"
  )
}

export function hasUnseenMentions(
  doc: Doc<unknown>,
  lastSeenHeads: LastSeenHeads | undefined,
  name: string
) {
  // TODO: one of these days we should figure out the typing
  return getUnseenPatches(doc as ThreadDoc, lastSeenHeads).some(
    (patch) =>
      patch.action === "put" &&
      patch.path.length === 3 &&
      patch.path[0] === "messages" &&
      typeof patch.value === "string" &&
      evalSearchFor(MENTION, patch.value).some(
        (match) => match.data.name.toLowerCase() === name.toLowerCase()
      )
  )
}

function stopPropagation(e: React.SyntheticEvent) {
  e.stopPropagation()
  e.nativeEvent.stopImmediatePropagation()
}

function renderMessage({ content, time }: Message, idx: number) {
  const date = new Date()
  date.setTime(time)

  const result = isPushpinUrl(content) ? (
    <div
      className="ThreadContent-clickable"
      onClick={() => {
        openDoc(content)
      }}
    >
      <Content url={content} context="list" />
    </div>
  ) : (
    content
  )

  return (
    <div className="message" key={idx}>
      <pre className="content">{result}</pre>
      {idx === 0 ? (
        <div className="time">{dateFormatter.format(date)}</div>
      ) : null}
    </div>
  )
}

function renderGroupedMessages(groupOfMessages: Message[], idx: number) {
  return (
    <div className="messageGroup" key={idx}>
      <div style={{ width: "40px" }}>
        <Content
          context="thread"
          url={createDocumentLink("contact", groupOfMessages[0].authorId)}
        />
      </div>
      <div className="groupedMessages">
        {groupOfMessages.map(renderMessage)}
      </div>
    </div>
  )
}

function groupBy<T, K extends keyof T>(items: T[], key: K): T[][] {
  const grouped: T[][] = []
  let currentGroup: T[]

  items.forEach((item) => {
    if (
      !currentGroup ||
      (currentGroup.length > 0 && currentGroup[0][key] !== item[key])
    ) {
      currentGroup = []
      grouped.push(currentGroup)
    }

    currentGroup.push(item)
  })

  return grouped
}

function create(unusedAttrs: any, handle: DocHandle<any>) {
  handle.change((doc) => {
    doc.messages = []
  })
}

const icon = "comments"

ContentTypes.register({
  type: "thread",
  name: "Thread",
  icon,
  contexts: {
    workspace: ThreadContent,
    board: ThreadContent,
    list: ThreadInList,
    "title-bar": ThreadInList,
  },
  create,
  hasUnseenChanges,
  hasUnseenMentions,
})
