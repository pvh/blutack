import React, { useEffect, useRef, useState } from "react"

import { ContentType } from "../pushpin-code/ContentTypes"
import { useHandle } from "@automerge/automerge-repo-react-hooks"
import "./TextContent.css"
import { ContentProps } from "../Content"
import "./WidgetEditor.css"
import { basicSetup } from "codemirror"
import { javascript } from "@codemirror/lang-javascript"
import { EditorView, keymap } from "@codemirror/view"
import { indentWithTab } from "@codemirror/commands"
import { WidgetDoc } from "./Widget"
import { plugin as amgPlugin, PatchSemaphore } from "@automerge/automerge-codemirror"
import {DocHandle, DocHandlePatchPayload} from "automerge-repo"
import {Heads} from "@automerge/automerge"
import * as automerge from "@automerge/automerge"
import {StateField} from "@codemirror/state"

export default function WidgetEditor(props: ContentProps) {
  const handle = useHandle<WidgetDoc>(props.documentId)
  const [isReady, setIsReady] = useState(false)

  handle.value().then(() => {
    if (typeof handle.doc.source === "string") {
      handle.change(doc => {
        doc.source = new automerge.Text(doc.source.toString())
      })
    }
    setIsReady(true)
  })

  if (!isReady) {
    return <div>Loading...</div>
  } else {
    return <CodeEditor handle={handle} />
  }
}

interface CodeEditorProps {
  handle: DocHandle<WidgetDoc>
}

function CodeEditor({ handle }: CodeEditorProps) {
  const containerRef = useRef(null)
  const editorViewRef = useRef<EditorView>()

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const plugin = amgPlugin(handle.doc, ["source"])
    const semaphore = new PatchSemaphore(plugin)
    const doChange = (atHeads: Heads, changeFn: (doc: WidgetDoc) => void): Heads => {
      handle.changeAt(atHeads, changeFn)
      return automerge.getHeads(handle.doc)
    }
    const view = (editorViewRef.current = new EditorView({
      doc: handle.doc.source.toString(),
      extensions: [basicSetup, plugin, javascript({ jsx: true }), keymap.of([indentWithTab])],
      dispatch(transaction) {
        view.update([transaction])
        if (transaction.docChanged) {
          semaphore.reconcile(handle.doc, doChange, view)
        }
      },
      parent: containerRef.current,
    }))

    const onPatch = (p: DocHandlePatchPayload<WidgetDoc>) => {
      semaphore.reconcile(handle.doc, doChange, view)
    }
    handle.on("patch", onPatch)

    return () => {
      view.destroy()
      editorViewRef.current = undefined
      handle.off("patch", onPatch)
    }
  }, [containerRef])

  return (
    <div className="WidgetEditor" ref={containerRef} onKeyDown={(evt) => evt.stopPropagation()} />
  )
}

export const contentType: ContentType = {
  type: "widgetEditor",
  name: "WidgetEditor",
  icon: "file-code",
  contexts: {
    root: WidgetEditor,
    board: WidgetEditor,
    expanded: WidgetEditor,
  },
  unlisted: true,
  dontAddToViewedDocUrls: true,
}
