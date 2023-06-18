import React, { useEffect, useRef, useState } from "react"
import { ContentType } from "../pushpin-code/ContentTypes"
import { useDocument } from "automerge-repo-react-hooks"
import { ContentProps } from "../Content"
import { DocHandle } from "automerge-repo"
import { EditorView, keymap } from "@codemirror/view"
import { basicSetup } from "codemirror"
import { javascript } from "@codemirror/lang-javascript"
import { indentWithTab } from "@codemirror/commands"
import { ErrorBoundary } from "react-error-boundary"
import "./Widget.css"
import { transform } from "@babel/standalone"

export interface WidgetDoc {
  title: string
  source: string
}

const AsyncFunction = async function () {}.constructor as any

export default function Widget(props: ContentProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [doc, changeDoc] = useDocument<WidgetDoc>(props.documentId)
  const errorBoundaryRef = useRef<ErrorBoundary | null>(null)
  const [View, setView] = useState<Function | undefined>(undefined)

  const source = doc?.source

  useEffect(() => {
    if (!source) {
      return undefined
    }

    if (errorBoundaryRef.current) {
      errorBoundaryRef.current.resetErrorBoundary()
    }

    ;(async () => {
      try {
        const transformedSource = transform(source, {
          presets: ["react"],
          parserOpts: { allowReturnOutsideFunction: true },
        })

        const functionBody = `with (context) { ${transformedSource.code} }`

        const view = await new AsyncFunction("context", functionBody)({
          React,
        })

        setView(() => view)
      } catch (err) {
        return undefined
      }
    })()
  }, [source])

  if (!doc) {
    return null
  }

  const onChangeSource = (source: string) => {
    changeDoc((doc) => {
      doc.source = source
    })
  }

  return (
    <div
      className="Widget"
      onDoubleClick={(evt) => evt.stopPropagation()}
      onPaste={(evt) => evt.stopPropagation()}
    >
      <div className="Widget-content">
        <ErrorBoundary
          fallback={<div className="Widget-error">Invalid syntax</div>}
          ref={errorBoundaryRef}
        >
          {View && <View doc={doc} changeDoc={changeDoc} />}
        </ErrorBoundary>
      </div>

      {isEditorOpen && <CodeEditor source={doc.source} onChangeSource={onChangeSource} />}
      {!isEditorOpen && (
        <button className="Widget-editButton" onClick={() => setIsEditorOpen(true)}>
          <span className="fa fa-edit"></span>
        </button>
      )}
      {isEditorOpen && (
        <button className="Widget-closeButton" onClick={() => setIsEditorOpen(false)}>
          <span className="fa fa-close"></span>
        </button>
      )}
    </div>
  )
}

interface CodeEditorProps {
  source: string
  onChangeSource: (source: string) => void
}

function CodeEditor({ source, onChangeSource }: CodeEditorProps) {
  const editorRef = useRef(null)

  useEffect(() => {
    if (!editorRef.current) {
      return
    }

    const view = new EditorView({
      doc: source,
      extensions: [basicSetup, javascript({ jsx: true }), keymap.of([indentWithTab])],
      dispatch(transaction) {
        view.update([transaction])

        if (transaction.docChanged) {
          const newValue = view.state.doc.toString()
          onChangeSource(newValue)
        }
      },
      parent: editorRef.current,
    })

    return () => {
      view.destroy()
    }
  }, [])

  return (
    <div className="Widget-editor" ref={editorRef} onKeyDown={(evt) => evt.stopPropagation()} />
  )
}

const EXAMPLE_SOURCE = `return ({doc, changeDoc}) => {
  const counter = doc.counter ?? 0
  
  const onClickCounter = () => {
    changeDoc((doc) => {
      doc.counter = counter + 1
    })
  }

  return (
    <div>
      <h1>My counter</h1>      
      <button onClick={onClickCounter}>{counter}</button>     
    </div>
  )
}`

function create({ text }: any, handle: DocHandle<any>) {
  handle.change((doc) => {
    doc.source = EXAMPLE_SOURCE
  })
}

export const contentType: ContentType = {
  type: "widget",
  name: "Widget",
  icon: "code",
  create,
  contexts: {
    root: Widget,
    board: Widget,
    expanded: Widget,
  },
}
