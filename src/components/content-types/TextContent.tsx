import React, { useEffect, useRef, useMemo, useState, useId } from "react"

import * as Automerge from "@automerge/automerge"
import Quill, {
  TextChangeHandler,
  QuillOptionsStatic,
  SelectionChangeHandler,
} from "quill"
import Delta from "quill-delta"
import * as ContentTypes from "../pushpin-code/ContentTypes"
import { ContentProps, EditableContentProps } from "../Content"
import { useDocument } from "automerge-repo-react-hooks"
import { useDocumentIds, useStaticCallback } from "../pushpin-code/Hooks"
import "./TextContent.css"
import Badge from "../ui/Badge"
import * as ContentData from "../pushpin-code/ContentData"
import * as WebStreamLogic from "../pushpin-code/WebStreamLogic"
import ListItem from "../ui/ListItem"
import ContentDragHandle from "../ui/ContentDragHandle"
import TitleWithSubtitle from "../ui/TitleWithSubtitle"
import { DocHandle, DocumentId } from "automerge-repo"
import QuillCursors from "quill-cursors"
import { usePresence } from "../pushpin-code/PresenceHooks"
import IQuillRange from "quill-cursors/dist/quill-cursors/i-range"
import { useSelf, useSelfId } from "../pushpin-code/SelfHooks"
import { ContactDoc } from "./contact"
import {
  getUnseenPatches,
  LastSeenHeads,
  useAutoAdvanceLastSeenHeads,
  useLastSeenHeads,
} from "../pushpin-code/Changes"
import { createDocumentLink } from "../pushpin-code/Url"
import { Doc, getHeads, Heads, view } from "@automerge/automerge"
import {
  evalAllSearches,
  evalSearchFor,
  Match,
  registerAutocompletion,
  registerSearch,
} from "../pushpin-code/Searches"
import "./Autocompletion.js"
import { shouldNotifyAboutDocChanges } from "./workspace/NotificationSetting"

Quill.register("modules/cursors", QuillCursors)

export interface TextDoc {
  title: string
  text: Automerge.Text
}

interface Props extends ContentProps {
  uniquelySelected?: boolean
}

TextContent.minWidth = 6
TextContent.minHeight = 2
TextContent.defaultWidth = 15

registerSearch("mention", {
  pattern: /@([a-zA-Z]+)/,
  style: {
    color: "#999",
    isBold: true,
  },
  data: ([, name]) => {
    return { name }
  },
})

registerSearch("headline", {
  pattern: /^#.*$/,
  style: {
    isBold: true,
  },
})

registerAutocompletion("mention", {
  pattern: /@([a-zA-Z])*$/,
  suggestions: ([match]: string[]) => {
    return [
      { value: "@pvh" },
      { value: "@paul" },
      { value: "@geoffrey" },
    ].filter((suggestion) => suggestion.value.startsWith(match))
  },
})

registerAutocompletion("soc", {
  pattern: /([0-9]{1,2}):([0-9]{2})$/,
  suggestions: ([, hours, minutes]: string[]) => {
    const soc = (parseInt(hours, 10) - 18) % 24
    const fraction = parseInt(minutes) / 60

    return [
      {
        value:
          `SOC ${soc}` + (fraction === 0 ? "" : fraction.toString().slice(1)),
      },
    ]
  },
})

export default function TextContent(props: Props) {
  const [doc, changeDoc] = useDocument<TextDoc>(props.documentId)
  const [cursorPos, setCursorPos] = useState<IQuillRange | undefined>(undefined)
  const selfId = useSelfId()
  // need to remove first and last char because id starts and ends with ":" which is not allowed in a html id
  const scrollingContainerId = `scroll-container-${useId().slice(1, -1)}`
  const containerRef = useRef<HTMLDivElement>(null)

  useAutoAdvanceLastSeenHeads(createDocumentLink("text", props.documentId))

  const presence = usePresence<IQuillRange | undefined>(
    props.documentId,
    cursorPos,
    "cursorPos"
  )

  const cursors: Cursor[] = useMemo(
    () =>
      presence.flatMap((p) => {
        if (p.data === undefined || p.contact === selfId) {
          return []
        }
        return [{ range: p.data, contactId: p.contact }]
      }),
    [presence]
  )

  const [ref, quill] = useQuill({
    text: doc ? doc.text : null,
    change(fn) {
      changeDoc((doc: TextDoc) => fn(doc.text))
    },
    selectionChange(range) {
      setCursorPos(range)
    },
    cursors,
    selected: props.uniquelySelected,
    config: {
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
      },
      scrollingContainer: `#${scrollingContainerId}`,
    },
  })

  return (
    <div
      className="TextContent"
      id={scrollingContainerId}
      onClick={() => quill?.focus()}
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
  )
}

interface Cursor {
  contactId: DocumentId
  range: IQuillRange
}

interface QuillOpts {
  text: Automerge.Text | null
  change: (cb: (text: Automerge.Text) => void) => void
  selectionChange: SelectionChangeHandler
  selected?: boolean
  cursors: Cursor[]
  config?: QuillOptionsStatic
}

function useQuill({
  text,
  change,
  selectionChange,
  cursors,
  selected,
  config,
}: QuillOpts): [React.Ref<HTMLDivElement>, Quill | null] {
  const ref = useRef<HTMLDivElement>(null)
  const quill = useRef<Quill | null>(null)
  // @ts-ignore-next-line
  const textString = useMemo(() => text && text.join(""), [text])
  const makeChange = useStaticCallback(change)
  const onSelectionChange = useStaticCallback(selectionChange)

  const contactIds = useMemo(
    () => cursors.map(({ contactId }) => contactId),
    [cursors]
  )
  const contactsById = useDocumentIds<ContactDoc>(contactIds)

  useEffect(() => {
    if (!ref.current) return () => {}

    const container = ref.current
    const q = new Quill(container, { scrollingContainer: container, ...config })
    quill.current = q

    if (textString) q.setText(textString)
    if (selected) q.focus()

    const onChange: TextChangeHandler = (changeDelta, _oldContents, source) => {
      if (source !== "user") return

      makeChange((content) => applyDeltaToText(content, changeDelta as any))
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Backspace") return

      const str = q.getText()
      if (str !== "" && str !== "\n") {
        e.stopPropagation()
      }
    }

    q.on("text-change", onChange)

    q.on("selection-change", onSelectionChange)

    /**
     * We bind this as a native event because of React's event delegation.
     * Quill will handle the keydown event and cause a react re-render before react has actually
     * seen the event at all. This causes a race condition where the doc looks like it was already
     * empty when Backspace is pressed, even though that very keypress made it empty.
     */
    container.addEventListener("keydown", onKeyDown, { capture: true })

    return () => {
      quill.current = null
      container.removeEventListener("keydown", onKeyDown, { capture: true })
      q.off("text-change", onChange)
      // Quill gets garbage collected automatically
    }
  }, [ref.current]) // eslint-disable-line

  useEffect(() => {
    const q = quill.current

    if (!textString || !q) return

    const delta = new Delta().insert(textString)
    const diff = q.getContents().diff(delta as any)

    q.updateContents(diff)

    const matches = evalAllSearches(textString)

    q.removeFormat(0, textString.length, "api")

    matches.forEach((formatting: Match) => {
      const index = formatting.from
      const length = formatting.to - index
      const { color, isBold, isItalic } = formatting.style

      if (color) {
        q.formatText(index, length, "color", formatting.style.color, "api")
      }

      if (isBold) {
        q.formatText(index, length, "bold", true, "api")
      }

      if (isItalic) {
        q.formatText(index, length, "italic", true, "api")
      }
    })
  }, [textString])

  useEffect(() => {
    if (!quill.current) {
      return
    }

    const quillCursors = quill.current?.getModule("cursors")

    const cursorsToDelete: { [id: string]: boolean } = {}
    for (const cursor of quillCursors.cursors()) {
      cursorsToDelete[cursor.id] = true
    }

    cursors.forEach(({ contactId, range }) => {
      const contact = contactsById[contactId]

      if (!contact) {
        return
      }

      delete cursorsToDelete[contactId]
      quillCursors.createCursor(contactId, contact.name, contact.color)
      quillCursors.moveCursor(contactId, range)
    })

    for (const cursorId of Object.keys(cursorsToDelete)) {
      quillCursors.removeCursor(cursorId)
    }
  }, [cursors])

  return [ref, quill.current]
}

function stopPropagation(e: React.SyntheticEvent) {
  e.stopPropagation()
  e.nativeEvent.stopImmediatePropagation()
}

function applyDeltaToText(text: Automerge.Text, delta: Delta): void {
  let i = 0
  delta.forEach((op, idx) => {
    if (op.retain && typeof op.retain == "number") {
      i += op.retain
    }

    if (typeof op.insert === "string") {
      const chars = op.insert.split("")
      text.insertAt!(i, ...chars)
      i += chars.length
    } else if (op.delete) {
      text.deleteAt!(i, op.delete)
    }
  })
}

async function createFrom(
  contentData: ContentData.ContentData,
  handle: DocHandle<TextDoc>
) {
  const text = await WebStreamLogic.toString(contentData.data)
  handle.change((doc) => {
    doc.text = new Automerge.Text()
    if (text) {
      doc.text.insertAt!(0, ...text.split(""))

      if (!text || !text.endsWith("\n")) {
        doc.text.insertAt!(text ? text.length : 0, "\n") // Quill prefers an ending newline
      }
    }
  })
}

function create({ text }: any, handle: DocHandle<any>) {
  handle.change((doc) => {
    doc.text = new Automerge.Text(text)
    if (!text || !text.endsWith("\n")) {
      doc.text.insertAt!(text ? text.length : 0, "\n") // Quill prefers an ending newline
    }
  })
}

function TextInList(props: EditableContentProps) {
  const { documentId, url, editable, selfId } = props
  const [doc] = useDocument<TextDoc>(documentId)
  const [self] = useSelf()
  const lastSeenHeads = useLastSeenHeads(createDocumentLink("text", documentId))

  if (!doc || !doc.text || !self) return null

  const lines = doc.text
    //  @ts-ignore-next-line
    .join("")
    .split("\n")
    .filter((l: string) => l.length > 0)

  const title = doc.title || lines.shift() || "[empty text note]"

  const showChangedDot = shouldNotifyAboutDocChanges(
    "text",
    doc,
    lastSeenHeads,
    selfId,
    self.name
  )
  const unseenChanges = hasUnseenChanges(doc, lastSeenHeads)

  return (
    <ListItem>
      <ContentDragHandle url={url}>
        <Badge
          icon="sticky-note"
          size="medium"
          dot={
            showChangedDot
              ? {
                  color: "var(--colorChangeDot)",
                }
              : undefined
          }
        />
      </ContentDragHandle>
      <TitleWithSubtitle
        title={title}
        documentId={documentId}
        editable={editable}
      />
    </ListItem>
  )
}

function hasUnseenChanges(doc: Doc<unknown>, lastSeenHeads?: LastSeenHeads) {
  return getUnseenPatches(doc, lastSeenHeads).some(
    (patch) =>
      patch.action === "splice" &&
      patch.path.length === 2 &&
      patch.path[0] === "text"
  )
}

// TODO: this is not really checking if the user has been mentioned since the doc was last seen
// as long as the user is mentioned in the doc once we consider any new changes to be unseen mentions
function hasUnseenMentions(
  doc: Doc<unknown>,
  lastSeenHeads: LastSeenHeads | undefined,
  name: string
) {
  const isUserMentionedInText = evalSearchFor(
    "mention",
    (doc as TextDoc).text.toString()
  ).some((match) => match.data.name.toLowerCase() === name.toLowerCase())

  return isUserMentionedInText && hasUnseenChanges(doc, lastSeenHeads)
}

const supportsMimeType = (mimeType: string) => !!mimeType.match("text/")

ContentTypes.register({
  type: "text",
  name: "Text",
  icon: "sticky-note",
  contexts: {
    board: TextContent,
    workspace: TextContent,
    list: TextInList,
    "title-bar": TextInList,
  },
  create,
  createFrom,
  supportsMimeType,
  hasUnseenChanges,
  hasUnseenMentions,
})
