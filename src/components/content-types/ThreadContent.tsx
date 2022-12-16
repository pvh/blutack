import React, { useCallback, useState } from "react"

import { ContentType } from "../pushpin-code/ContentTypes"
import Content, { ContentProps } from "../Content"
import { createDocumentLink, isPushpinUrl } from "../pushpin-code/Url"
import ListItem from "../ui/ListItem"
import "./ThreadContent.css"
import { DocumentId } from "automerge-repo"
import { useDocument } from "automerge-repo-react-hooks"

import { DocHandle } from "automerge-repo"
import * as ImportData from "../pushpin-code/ImportData"
import { openDoc } from "../pushpin-code/Url"
import {
  getUnseenPatches,
  LastSeenHeads,
  useAutoAdvanceLastSeenHeads,
} from "../pushpin-code/Changes"
import { Doc, getHeads } from "@automerge/automerge"
import memoize from "lodash.memoize"
import { useDocumentIds, useDocuments } from "../pushpin-code/Hooks"
import { ContactDoc } from "./contact"
import { readWithSchema } from "../../lenses"
import { HasTitle } from "../../lenses/HasTitle"
import Heading from "../ui/Heading"

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
  const [message, setMessage] = useState("")
  const [doc, changeDoc] = useDocument<ThreadDoc>(props.documentId)

  const contactLinks = [...new Set(doc?.messages.map((m) => m.authorId))]
  const contacts = useDocumentIds<ContactDoc>(contactLinks)

  let contactTitles: { [key: string]: HasTitle } = {}
  for (let [key, value] of Object.entries(contacts)) {
    contactTitles[key] = readWithSchema({
      doc: value,
      type: "contact",
      schema: "HasTitle",
      lastSeenHeads: undefined,
    })
  }

  console.log({ contacts, contactTitles, contactLinks })

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

  if (!doc || !doc.messages) {
    return null
  }

  const { messages } = doc
  const groupedMessages = groupBy(messages, "authorId")

  function onInput(e: React.ChangeEvent<HTMLInputElement>) {
    setMessage(e.target.value)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    e.stopPropagation()

    if (e.key === "Enter" && !e.shiftKey && message) {
      e.preventDefault()

      changeDoc((threadDoc: ThreadDoc) => {
        threadDoc.messages.push({
          authorId: props.selfId,
          content: message,
          time: new Date().getTime(),
        })
      })

      setMessage("")
    }
  }

  return (
    <div
      className="threadWrapper"
      onDrop={onDrop}
      onDragOver={preventDefault}
      onDragEnter={preventDefault}
    >
      <div className="messageWrapper">
        <div className="messages" onScroll={stopPropagation}>
          {groupedMessages.map((messages, index) =>
            renderGroupedMessages(messages, index, contactTitles)
          )}
        </div>
      </div>
      <div className="inputWrapper">
        <input
          className="messageInput"
          value={message}
          onKeyDown={onKeyDown}
          onChange={onInput}
          onPaste={stopPropagation}
          onCut={stopPropagation}
          onCopy={stopPropagation}
          placeholder="Enter your message..."
        />
      </div>
    </div>
  )
}

function preventDefault(e: React.SyntheticEvent) {
  e.preventDefault()
}

export const getUnreadMessageCountOfThread = memoize(
  (doc: ThreadDoc, lastSeenHeads?: LastSeenHeads) => {
    // count any splice on the messages property of the thread document as a change
    return getUnseenPatches(doc, lastSeenHeads).filter(
      (patch) =>
        patch.action === "splice" && patch.path.length === 2 && patch.path[0] === "messages"
    ).length
  },
  (doc, lastSeenHeads) => `${getHeads(doc).join(",")}:${JSON.stringify(lastSeenHeads)}`
)

export function hasUnseenChanges(doc: Doc<unknown>, lastSeenHeads: LastSeenHeads) {
  // TODO: one of these days we should figure out the typing
  return getUnreadMessageCountOfThread(doc as ThreadDoc, lastSeenHeads) > 0
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
      <ListItem>
        <Content url={content} context="badge" />
        <Content url={content} context="title" />
      </ListItem>
    </div>
  ) : (
    content
  )

  return (
    <div className="message" key={idx}>
      <div className="content">{result}</div>
      {idx === 0 ? <div className="time">{dateFormatter.format(date)}</div> : null}
    </div>
  )
}

function renderGroupedMessages(
  groupOfMessages: Message[],
  idx: number,
  contactTitles: { [key: string]: HasTitle }
) {
  return (
    <div className="messageGroup" key={idx}>
      <div style={{ width: "40px" }}>
        <Content context="badge" url={createDocumentLink("contact", groupOfMessages[0].authorId)} />
      </div>
      <div className="groupedMessages">
        <Heading>{contactTitles[groupOfMessages[0].authorId]?.title}</Heading>
        {groupOfMessages.map(renderMessage)}
      </div>
    </div>
  )
}

function groupBy<T, K extends keyof T>(items: T[], key: K): T[][] {
  const grouped: T[][] = []
  let currentGroup: T[]

  items.forEach((item) => {
    if (!currentGroup || (currentGroup.length > 0 && currentGroup[0][key] !== item[key])) {
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

export const contentType: ContentType = {
  type: "thread",
  name: "Thread",
  icon,
  contexts: {
    expanded: ThreadContent,
    board: ThreadContent,
  },
  create,

  // TODO: figure out where this function should live;
  // can it live outside the content type on a lens or something?
  // Would need to return not just a boolean but also the count
  hasUnseenChanges,
}
