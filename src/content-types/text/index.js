const {
  Automerge,
  WebStreamLogic,
  useDocument,
  useStaticCallback,
  useDocumentIds,
  useSelfId,
  usePresence,
  Searches,
  Url,
} = Blutack

import Quill from "quill"
import Delta from "quill-delta"
import QuillCursors from "quill-cursors"
const { useEffect, useRef, useMemo, useState, useId } = React

// todo:  commented out to make bootstrapping work
// Quill.register("modules/cursors", QuillCursors)

TextContent.minWidth = 6
TextContent.minHeight = 2
TextContent.defaultWidth = 15

export default function TextContent(props) {
  const [doc, changeDoc] = useDocument(props.documentId)
  const [cursorPos, setCursorPos] = useState(undefined)
  const selfId = useSelfId()
  // need to remove first and last char because id starts and ends with ":" which is not allowed in a html id
  const scrollingContainerId = `scroll-container-${useId().slice(1, -1)}`
  const containerRef = useRef(null)

  const presence = usePresence(props.documentId, cursorPos, "cursorPos")

  const cursors = useMemo(
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
      changeDoc((doc) => fn(doc.text))
    },
    selectionChange(range) {
      setCursorPos(range)
    },
    cursors,
    selected: props.uniquelySelected,
    config: {
      formats: ["bold", "color", "italic"],
      modules: {
        // todo:  commented out to make bootstrapping work
        /* mention: {},
        cursors: {
          hideDelayMs: 500,
          transformOnTextChange: true,
        }, */
        toolbar: false,
        history: {
          maxStack: 500,
          userOnly: true,
        },
        clipboard: {
          disableFormattingOnPaste: true,
        },
      },
      scrollingContainer: `#${scrollingContainerId}`,
    },
  })

  return (
    <div
      className="TextContent"
      id={scrollingContainerId}
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
  )
}

export function useQuill({ text, change, selectionChange, cursors = [], selected, config }) {
  const ref = useRef(null)
  const quill = useRef(null)
  // @ts-ignore-next-line
  const textString = useMemo(() => text && text.join(""), [text])
  const makeChange = useStaticCallback(change ?? (() => {}))
  const onSelectionChange = useStaticCallback(selectionChange ?? (() => {}))

  const contactIds = useMemo(() => cursors.map(({ contactId }) => contactId), [cursors])
  const contactsById = useDocumentIds(contactIds)

  useEffect(() => {
    if (!ref.current) return () => {}

    const container = ref.current
    const q = new Quill(container, { scrollingContainer: container, ...config })
    quill.current = q

    if (textString) q.setText(textString)
    if (selected) q.focus()

    const onChange = (changeDelta, _oldContents, source) => {
      if (source !== "user") return

      makeChange((content) => applyDeltaToText(content, changeDelta))
    }

    function onKeyDown(e) {
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
    const diff = q.getContents().diff(delta)

    q.updateContents(diff)

    const matches = Searches.evalAllSearches(textString)

    q.removeFormat(0, textString.length, "api")

    matches.forEach((formatting) => {
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


    // todo:  commented out to make bootstrapping work
    // const quillCursors = quill.current?.getModule("cursors")

    const cursorsToDelete = {}
    // todo:  commented out to make bootstrapping work
    for (const cursor of [] /* quillCursors.cursors() */) {
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

  return [ref, quill]
}

function stopPropagation(e) {
  e.stopPropagation()
  e.nativeEvent.stopImmediatePropagation()
}

function applyDeltaToText(text, delta) {
  let i = 0
  delta.forEach((op, idx) => {
    if (op.retain && typeof op.retain == "number") {
      i += op.retain
    }

    if (typeof op.insert === "string") {
      const chars = op.insert.split("")
      text.insertAt(i, ...chars)
      i += chars.length
    } else if (op.delete) {
      text.deleteAt(i, op.delete)
    }
  })
}

async function createFrom(contentData, handle) {
  const text = await WebStreamLogic.toString(contentData.data)
  handle.change((doc) => {
    doc.text = new Automerge.Text()
    if (text) {
      doc.text.insertAt(0, ...text.split(""))

      if (!text || !text.endsWith("\n")) {
        doc.text.insertAt(text ? text.length : 0, "\n") // Quill prefers an ending newline
      }
    }
  })
}

function create({ text, title }, handle) {
  handle.change((doc) => {
    if (title) {
      doc.title = title
    }

    console.log("create text")

    doc.text = new Automerge.Text(text)
    if (!text || !text.endsWith("\n")) {
      doc.text.insertAt(text ? text.length : 0, "\n") // Quill prefers an ending newline
    }
  })
}

const supportsMimeType = (mimeType) => !!mimeType.match("text/")

export const contentType = {
  type: "text",
  name: "Text",
  icon: "sticky-note",
  contexts: {
    board: TextContent,
    expanded: TextContent,
  },
  create,
  createFrom,
  supportsMimeType,
}
