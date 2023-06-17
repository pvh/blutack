import React, { useEffect, useMemo, useRef } from "react"
import { ContentType } from "../pushpin-code/ContentTypes"
import { useDocument } from "automerge-repo-react-hooks"
import { ContentProps } from "../Content"
import { DocHandle } from "automerge-repo"
import { html } from "htm/react"
import { EditorView, keymap } from "@codemirror/view"
import { basicSetup } from "codemirror"
import { javascript } from "@codemirror/lang-javascript"
import { indentWithTab } from "@codemirror/commands"
import { ErrorBoundary } from "react-error-boundary"

export interface WidgetDoc {
  title: string
  source: string
}

export default function Widget(props: ContentProps) {
  const [doc, changeDoc] = useDocument<WidgetDoc>(props.documentId)
  const errorBoundaryRef = useRef<ErrorBoundary | null>(null)

  const source = doc?.source

  const View: Function | undefined = useMemo(() => {
    if (!source) {
      return undefined
    }

    if (errorBoundaryRef.current) {
      errorBoundaryRef.current.resetErrorBoundary()
    }

    try {
      return new Function("context", `with (context) { return ${doc.source} }`)({
        html,
      })
    } catch (err) {
      return undefined
    }
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
    <div onDoubleClick={(evt) => evt.stopPropagation()}>
      <CodeEditor source={doc.source} onChangeSource={onChangeSource} />
      <ErrorBoundary fallback={<div>Something went wrong</div>} ref={errorBoundaryRef}>
        {View && <View doc={doc} changeDoc={changeDoc} />}
      </ErrorBoundary>
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
      extensions: [basicSetup, javascript(), keymap.of([indentWithTab])],
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

  return <div ref={editorRef} onKeyDown={(evt) => evt.stopPropagation()} />
}

const EXAMPLE_SOURCE = `({doc, changeDoc}) => {
  return html\`
    <div>Hello world!</div>
  \`
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
