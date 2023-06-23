import React, { useEffect, useRef } from "react"
import { useDocument, Modules, Context } from "../lib/blutack"
// const { useDocument, Modules, Context } = Blutack
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
    },
  },
}

export default function Editor(props) {
  const [doc, changeDoc] = useDocument(props.documentId)
  const [profile, changeProfile] = Context.useProfile()

  if (!doc) {
    return null
  }

  if (doc.source === undefined) {
    return <div>Document has no editable source</div>
  }

  const onChangeSource = async (source) => {
    changeDoc((doc) => {
      doc.source = source

      try {
        const transformedCode = transform(source, {
          presets: ["react"],
          plugins: [importTransformPlugin],
          parserOpts: { allowReturnOutsideFunction: true },
        })

        if (!transformedCode.code) {
          return
        }

        doc.dist = transformedCode.code
      } catch (error) {
        console.error(error)
      }
    })

    const module = await Modules.load(props.documentId)

    // update registration in profile depending on weather the module defines a content type
    changeProfile((profile) => {
      if (!profile.contentTypeIds) {
        profile.contentTypeIds = []
      }

      const indexOfModule = profile.contentTypeIds.indexOf(props.documentId)

      if (module.contentType && indexOfModule === -1) {
        profile.contentTypeIds.push(props.documentId)
      } else if (!module.contentType && indexOfModule !== -1) {
        profile.contentTypeIds.splice(indexOfModule, 1)
      }
    })
  }

  return (
    <div className="w-full h-full">
      <CodeEditor source={doc.source} onChangeSource={onChangeSource} />
    </div>
  )
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

export const contentType = {
  type: "editor",
  name: "Editor",
  icon: "file-code",
  contexts: {
    root: Editor,
    board: Editor,
    expanded: Editor,
  },
  unlisted: true,
  dontAddToViewedDocUrls: true,
}
