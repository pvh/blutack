import React, { useEffect, useRef } from "react"
import { useDocument } from "automerge-repo-react-hooks"
import "./TextContent.css"
import { basicSetup } from "codemirror"
import { javascript } from "@codemirror/lang-javascript"
import { EditorView, keymap } from "@codemirror/view"
import { indentWithTab } from "@codemirror/commands"
import { transform } from "@babel/standalone"

const importTransformPlugin = {
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

export default function Editor(props) {
  const [doc, changeDoc] = useDocument(props.documentId)

  if (!doc) {
    return null
  }

  if (!doc.source) {
    return <div>Source of document is not editable</div>
  }

  const onChangeSource = source => {
    changeDoc(doc => {
      doc.source = source

      try {
        const transformedCode = transform(source, {
          presets: ["react"],
          plugins: [importTransformPlugin],
          parserOpts: { allowReturnOutsideFunction: true }
        })

        if (!transformedCode.code) {
          return
        }

        doc.compiledSource = transformedCode.code
      } catch (error) {
        console.error(error)
      }
    })
  }

  return <CodeEditor source={doc.source} onChangeSource={onChangeSource} />
}

function CodeEditor({ source, onChangeSource }) {
  const containerRef = useRef(null)
  const editorViewRef = useRef()

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const view = (editorViewRef.current = new EditorView({
      doc: source,
      extensions: [
        basicSetup,
        javascript({ jsx: true }),
        keymap.of([indentWithTab])
      ],
      dispatch(transaction) {
        view.update([transaction])

        if (transaction.docChanged) {
          const newValue = view.state.doc.toString()
          onChangeSource(newValue)
        }
      },
      parent: containerRef.current
    }))

    return () => {
      view.destroy()
    }
  }, [])

  return (
    <div
      className="WidgetEditor"
      ref={containerRef}
      onKeyDown={evt => evt.stopPropagation()}
    />
  )
}

export const contentType = {
  type: "editor",
  name: "Editor",
  icon: "file-code",
  contexts: {
    root: Editor,
    board: Editor,
    expanded: Editor
  },
  unlisted: true,
  dontAddToViewedDocUrls: true
}
