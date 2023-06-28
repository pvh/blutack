import React, { useEffect, useRef, useState } from "react"
import { ContentType } from "../pushpin-code/ContentTypes"
import { useDocument, useHandle } from "@automerge/automerge-repo-react-hooks"
import Content, { ContentProps } from "../Content"
import { DocHandle } from "@automerge/automerge-repo"
import { ErrorBoundary } from "react-error-boundary"
import "./Widget.css"
import { transform } from "@babel/standalone"
import * as automerge from "@automerge/automerge"

export interface WidgetDoc {
  title: string
  source: string | automerge.Text
  error: string | undefined
}

const AsyncFunction = async function () {}.constructor as any

export default function Widget(props: ContentProps) {
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
        const transformedSource = transform(source.toString(), {
          presets: ["react"],
          parserOpts: { allowReturnOutsideFunction: true },
        })

        const functionBody = `with (context) { ${transformedSource.code} }`

        const view = await new AsyncFunction("context", functionBody)({
          React,
          useHandle,
          Content,
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

  return (
    <div
      className="Widget"
      onDoubleClick={(evt) => evt.stopPropagation()}
      onPaste={(evt) => evt.stopPropagation()}
    >
      <div className="Widget-content">
        <ErrorBoundary fallbackRender={fallbackRender} ref={errorBoundaryRef}>
          {View && <View doc={doc} changeDoc={changeDoc} />}
        </ErrorBoundary>
      </div>
    </div>
  )
}

function fallbackRender({ error }: any) {
  return (
    <div>
      <p>Something went wrong:</p>
      <pre style={{ color: "red" }}>{error.stack}</pre>
    </div>
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
    doc.source = new automerge.Text(EXAMPLE_SOURCE)
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
