import React, { useEffect, useRef, useState } from "react"

import * as Automerge from "@automerge/automerge"
import { Prop } from "@automerge/automerge"
import { unstable as automerge } from "@automerge/automerge"

import { ContentType } from "../pushpin-code/ContentTypes"
import { ContentProps } from "../Content"
import { useHandle } from "automerge-repo-react-hooks"
import "./TextContent.css"
import * as ContentData from "../pushpin-code/ContentData"
import * as WebStreamLogic from "../pushpin-code/WebStreamLogic"
import QuillCursors from "quill-cursors"
import IQuillRange from "quill-cursors/dist/quill-cursors/i-range"
import {
  getUnseenPatches,
  LastSeenHeads,
  useAutoAdvanceLastSeenHeads,
} from "../pushpin-code/Changes"
import { createDocumentLink } from "../pushpin-code/Url"
import { Doc } from "@automerge/automerge"
import { evalSearchFor, MENTION } from "../pushpin-code/Searches"
import "./Autocompletion.js"

import { Command, EditorState, Transaction } from "prosemirror-state"
import { keymap } from "prosemirror-keymap"
import { baseKeymap, toggleMark } from "prosemirror-commands"
import { schema } from "prosemirror-schema-basic"
import { Attrs, MarkType } from "prosemirror-model"
import { EditorView } from "prosemirror-view"
import { DocHandle, DocHandlePatchPayload } from "automerge-repo"
import "prosemirror-view/style/prosemirror.css"
import {
  plugin as amgPlugin,
  init as initPm,
  PatchSemaphore,
  MarkMap,
} from "@automerge/prosemirror"
import { MarkValue } from "@automerge/automerge/dist/types"

export interface TextDoc {
  title: string
  text: Automerge.Text
  links: { [key: string]: { href: string } }
}

interface Props extends ContentProps {
  uniquelySelected?: boolean
}

TextContent.minWidth = 6
TextContent.minHeight = 2
TextContent.defaultWidth = 15

export type EditorProps = {
  handle: DocHandle<any>
  path: Prop[]
}

const toggleBold = toggleMarkCommand(schema.marks.strong)
const toggleItalic = toggleMarkCommand(schema.marks.em)

function toggleMarkCommand(mark: MarkType): Command {
  return (state: EditorState, dispatch: ((tr: Transaction) => void) | undefined) => {
    return toggleMark(mark)(state, dispatch)
  }
}

const toggleLink: Command = (state, dispatch) => {
  let { doc, selection } = state
  if (selection.empty) return false
  const attrs = { href: prompt("Link to where?", "") }
  if (!attrs.href) return false

  return toggleMark(schema.marks.link, attrs)(state, dispatch)
}

export default function TextContent(props: Props) {
  const handle = useHandle<TextDoc>(props.documentId)
  const [cursorPos, setCursorPos] = useState<IQuillRange | undefined>(undefined)

  useAutoAdvanceLastSeenHeads(createDocumentLink("text", props.documentId))
  return Editor({ handle, path: ["text"] })
}

const markMap: MarkMap<TextDoc> = {
  createMark(doc: TextDoc, markName: string, value: any): MarkValue {
    if (markName === "link") {
      if (!doc.links) {
        doc.links = {}
      }
      const linkId = Math.random().toString(16).slice(2)
      doc.links[linkId] = {
        href: value.href,
      }
      return linkId
    } else {
      return true
    }
  },
  loadMark(doc: TextDoc, markName: string, markValue: any): Attrs {
    if (markName === "link" && typeof markValue === "string") {
      return {
        href: doc.links[markValue].href,
      }
    } else {
      return {}
    }
  },
}

function Editor({ handle, path }: EditorProps) {
  const editorRoot = useRef<HTMLDivElement>(null!)

  useEffect(() => {
    handle.value().then((doc) => {
      let editorConfig = {
        schema,
        plugins: [
          keymap({
            ...baseKeymap,
            "Mod-b": toggleBold,
            "Mod-i": toggleItalic,
            "Mod-l": toggleLink, //toggleMark(schema.marks.link, {href: "https://example.com", title: "example"}),
          }),
          amgPlugin(handle.doc, path, { markMap }),
        ],
        doc: initPm(handle.doc, path, { markMap }),
      }

      const semaphore = new PatchSemaphore()
      let state = EditorState.create(editorConfig)
      const doChange = (fn: (d: automerge.Doc<any>) => void): automerge.Doc<any> => {
        handle.change(fn)
        return handle.doc
      }
      const view = new EditorView(editorRoot.current, {
        state,
        dispatchTransaction: (tx: Transaction) => {
          let newState = semaphore.intercept(
            automerge.getHeads(handle.doc),
            doChange,
            tx,
            view.state
          )
          view.updateState(newState)
        },
      })
      const onPatch = (p: DocHandlePatchPayload<any>) => {
        let newState = semaphore.reconcilePatch(
          p.after,
          p.patches,
          automerge.getHeads(p.after),
          view.state
        )
        view.updateState(newState)
      }
      handle.on("patch", onPatch)
    })
    return () => {
      // TODO: we can't run this function as written until the document has loaded but we weren't waiting for that
      // view.destroy()
      // handle.off("patch", onPatch)
    }
  }, [])

  return <div ref={editorRoot}></div>
}

async function createFrom(contentData: ContentData.ContentData, handle: DocHandle<TextDoc>) {
  const text = await WebStreamLogic.toString(contentData.data)
  handle.change((doc) => {
    doc.text = new Automerge.Text(text)
  })
}

function create({ text }: any, handle: DocHandle<any>) {
  handle.change((doc) => {
    doc.text = new Automerge.Text(text)
  })
}

export function hasUnseenChanges(doc: Doc<unknown>, lastSeenHeads?: LastSeenHeads) {
  return getUnseenPatches(doc, lastSeenHeads).some(
    (patch) => patch.action === "splice" && patch.path.length === 2 && patch.path[0] === "text"
  )
}

// TODO: this is not really checking if the user has been mentioned since the doc was last seen
// as long as the user is mentioned in the doc once we consider any new changes to be unseen mentions
export function hasUnseenMentions(
  doc: Doc<unknown>,
  lastSeenHeads: LastSeenHeads | undefined,
  name: string
) {
  if (!name) {
    debugger
  }

  const isUserMentionedInText = evalSearchFor(MENTION, (doc as TextDoc).text.toString()).some(
    (match) => match.data.name.toLowerCase() === name.toLowerCase()
  )

  return isUserMentionedInText && hasUnseenChanges(doc, lastSeenHeads)
}

const supportsMimeType = (mimeType: string) => !!mimeType.match("text/")

export const contentType: ContentType = {
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
  hasUnseenChanges,
  hasUnseenMentions,
}
