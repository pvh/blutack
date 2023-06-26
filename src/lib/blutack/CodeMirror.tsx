import React, { useEffect, useRef } from "react"
import { EditorView, keymap } from "@codemirror/view"
import { basicSetup } from "codemirror"
import { javascript } from "@codemirror/lang-javascript"
import { indentWithTab } from "@codemirror/commands"

interface ViewProps {
  source: string
  onChangeSource: (source: string) => void
}

export default function CodeMirror({ source, onChangeSource }: ViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const editorViewRef = useRef<EditorView>()

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const view = (editorViewRef.current = new EditorView({
      doc: source,
      extensions: [basicSetup, javascript({ jsx: true }), keymap.of([indentWithTab])],
      dispatch(transaction) {
        view.update([transaction])

        if (transaction.docChanged) {
          const newValue = view.state.doc.toString()
          onChangeSource(newValue)
        }
      },
      parent: containerRef.current,
    }))

    return () => {
      view.destroy()
    }
  }, [])

  return (
    <div ref={containerRef} onKeyDown={(evt) => evt.stopPropagation()} />
  )
}
