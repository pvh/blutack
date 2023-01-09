import React, { useCallback, useRef } from "react"

import { ContentType } from "../pushpin-code/ContentTypes"
import Content, { ContentProps } from "../Content"
import { createDocumentLink, isPushpinUrl, PushpinUrl } from "../pushpin-code/Url"
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
import { Doc, Text } from "@automerge/automerge"
import { evalSearchFor, MENTION } from "../pushpin-code/Searches"
import { useSelf } from "../pushpin-code/SelfHooks"
import { shouldNotifyAboutDocChanges } from "./workspace/NotificationSetting"
import { useQuill } from "./TextContent"
import { useStaticCallback } from "../pushpin-code/Hooks"
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

const dateFormatterTimeOnly = new Intl.DateTimeFormat("en-US", {
  localeMatcher: "best fit",
  hour: "numeric",
  minute: "2-digit",
})

const dateFormatterFullDate = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  weekday: "short",
  day: "numeric",
  month: "numeric",
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

  const initialLastSeenHeads = useAutoAdvanceLastSeenHeads(
    createDocumentLink("thread", props.documentId)
  )
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

  const oldestUnseenMessageTimestamp = getOldestUnseenMessageTimestamp(doc, initialLastSeenHeads)

  const messageGroups = groupMessageByAuthor(doc.messages)

  return (
    <div
      className="threadWrapper"
      onDrop={onDrop}
      onDragOver={preventDefault}
      onDragEnter={preventDefault}
    >
      <div className="messageWrapper">
        <div className="messages" onScroll={stopPropagation}>
          {messageGroups.map((messageGroup, idx) => {
            const prevMessageGroup = messageGroups[idx - 1]

            const isFirstMessageGroupOfDay =
              !prevMessageGroup ||
              !isOnSameDay(prevMessageGroup.messages[0].time, messageGroup.messages[0].time)

            return (
              <React.Fragment key={idx}>
                {isFirstMessageGroupOfDay && (
                  <div className="Thread-dayLine">
                    <div className="Thread-dayLineDate">
                      {dateFormatterFullDate.format(messageGroup.messages[0].time)}
                    </div>
                  </div>
                )}
                <MessageGroupView
                  contactTitles={contactTitles}
                  messageGroup={messageGroup}
                  oldestUnseenMessageTimestamp={oldestUnseenMessageTimestamp}
                />
              </React.Fragment>
            )
          })}
        </div>
      </div>
      <div className="inputWrapper" onClick={() => quill.current?.focus()} ref={containerRef}>
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

export function getOldestUnseenMessageTimestamp(
  doc: Doc<ThreadDoc>,
  lastSeenHeads?: LastSeenHeads
): number | undefined {
  let oldestTimestamp: number | undefined

  getUnseenPatches(doc, lastSeenHeads).forEach((patch) => {
    if (
      patch.action === "put" &&
      patch.path.length === 3 &&
      patch.path[0] === "messages" &&
      patch.path[2] === "time"
    ) {
      if (oldestTimestamp === undefined || (patch.value && patch.value < oldestTimestamp)) {
        oldestTimestamp = patch.value as number
      }
    }
  })

  return oldestTimestamp
}

export function getUnreadMessageCountOfThread(
  doc: ThreadDoc,
  lastSeenHeads?: LastSeenHeads
): number {
  return getUnseenPatches(doc as ThreadDoc, lastSeenHeads).filter(
    (patch) => patch.action === "splice" && patch.path.length === 2 && patch.path[0] === "messages"
  ).length
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

interface MessageProps {
  message: Message
  oldestUnseenMessageTimestamp?: number
}

function MessageView({ message, oldestUnseenMessageTimestamp }: MessageProps) {
  const result = isPushpinUrl(message.content) ? (
    <div
      className="ThreadContent-clickable"
      onClick={() => {
        openDoc(message.content as PushpinUrl)
      }}
    >
      <ListItem>
        <Content url={message.content} context="badge" />
        <Content url={message.content} context="title" />
      </ListItem>
    </div>
  ) : (
    message.content
  )

  return (
    <>
      {oldestUnseenMessageTimestamp === message.time && (
        <div className="Thread-unreadLine">
          <div className="Thread-unreadLineLabel">NEW</div>
        </div>
      )}

      <div className="message">
        <pre className="content">{result}</pre>
      </div>
    </>
  )
}

interface MessageGroupProps {
  messageGroup: MessageGroup
  oldestUnseenMessageTimestamp?: number
  contactTitles: { [key: string]: HasTitle }
}

function MessageGroupView({
  messageGroup,
  oldestUnseenMessageTimestamp,
  contactTitles,
}: MessageGroupProps) {
  const date = new Date()
  date.setTime(messageGroup.messages[0].time)

  return (
    <div className="messageGroup">
      <div style={{ width: "40px" }}>
        <Content context="badge" url={createDocumentLink("contact", messageGroup.authorId)} />
      </div>
      <div className="groupedMessages">
        <Heading wrap={false}>
          <>
            {contactTitles[messageGroup.authorId]?.title}
            <span className="time">{dateFormatterTimeOnly.format(date)}</span>
          </>
        </Heading>
        {messageGroup.messages.map((message, idx) => (
          <MessageView
            key={idx}
            message={message}
            oldestUnseenMessageTimestamp={oldestUnseenMessageTimestamp}
          />
        ))}
      </div>
    </div>
  )
}

interface MessageGroup {
  authorId: DocumentId
  messages: Message[]
}

function groupMessageByAuthor(messages: Message[]): MessageGroup[] {
  const messageGroups: MessageGroup[] = []
  let currentMessageGroup: MessageGroup

  messages.forEach((message, idx) => {
    const previousMessage = messages[idx - 1]

    if (
      !previousMessage ||
      currentMessageGroup.authorId !== message.authorId ||
      // more than 10 minutes gap to previous message
      (previousMessage && message.time - previousMessage.time > 10 * 60 * 1000) ||
      !isOnSameDay(message.time, previousMessage.time)
    ) {
      currentMessageGroup = {
        authorId: message.authorId,
        messages: [message],
      }
      messageGroups.push(currentMessageGroup)
    } else {
      currentMessageGroup.messages.push(message)
    }
  })

  return messageGroups
}

function isOnSameDay(timestampA: number, timestampB: number): boolean {
  return new Date(timestampA).getDate() === new Date(timestampB).getDate()
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

  hasUnseenMentions,
}
