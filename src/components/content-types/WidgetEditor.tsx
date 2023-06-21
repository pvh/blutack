import React, { useEffect, useRef } from "react"
import { ContentType } from "../pushpin-code/ContentTypes"
import { useDocument } from "automerge-repo-react-hooks"
import "./TextContent.css"
import { ContentProps } from "../Content"
import "./WidgetEditor.css"
import { basicSetup } from "codemirror"
import { javascript } from "@codemirror/lang-javascript"
import { EditorView, keymap } from "@codemirror/view"
import { indentWithTab } from "@codemirror/commands"
import { WidgetDoc } from "./Widget"
import { transform } from "@babel/standalone"
import { PluginObj } from "@babel/core"

const importTransformPlugin: PluginObj =  {
    name: "transform-imports-to-skypack",
    visitor: {
      ImportDeclaration(path) {
        const value = path.node.source.value

        // Don't replace relative or absolute URLs.
        if (/^([./])/.test(value)) {
          return
        }

        path.node.source.value = `https://cdn.skypack.dev/${value}`
      }
    }
}

export default function WidgetEditor(props: ContentProps) {
  const [doc, changeDoc] = useDocument<WidgetDoc>(props.documentId)

  if (!doc) {
    return null
  }

  const onChangeSource = (source: string) => {
    changeDoc((doc) => {
      doc.source = source
      const dist = transform(source, {
        presets: ["react"],
        plugins: [importTransformPlugin],
        parserOpts: { allowReturnOutsideFunction: true },
      })

      if (!dist.code) {
        return
      }

      doc.dist = dist.code
    })
  }

  return <CodeEditor source={doc.source} onChangeSource={onChangeSource} />
}

interface CodeEditorProps {
  source: string
  onChangeSource: (source: string) => void
}

function CodeEditor({ source, onChangeSource }: CodeEditorProps) {
  const containerRef = useRef(null)
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
