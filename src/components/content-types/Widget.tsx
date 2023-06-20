import React, { useEffect, useRef, useState } from "react"
import { ContentType } from "../pushpin-code/ContentTypes"
import { useDocument, useHandle } from "automerge-repo-react-hooks"
import Content, { ContentProps } from "../Content"
import { DocHandle } from "automerge-repo"
import { ErrorBoundary } from "react-error-boundary"
import "./Widget.css"
import { BinaryDataId, createBinaryDataUrl } from "../../blobstore/Blob"

export interface WidgetDoc {
  title: string
  source: string
  dist?: string
  error: string | undefined
}

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
      // fetch ourselves as an ES module
      const module = await import(
        createBinaryDataUrl(
          `web+binarydata://${props.documentId}?rand=${Math.random()}` as unknown as BinaryDataId
        )
      )
      setView(() => module.default)
    })()
  }, [source])

  if (!doc) {
    return null
  }

  const context = {
    React,
    Content,
    useDocument,
    useHandle,
  }
  console.log("view", View)

  return (
    <div
      className="Widget"
      onDoubleClick={(evt) => evt.stopPropagation()}
      onPaste={(evt) => evt.stopPropagation()}
    >
      <div className="Widget-content">
        <ErrorBoundary fallbackRender={fallbackRender} ref={errorBoundaryRef}>
          {View && <View contentProps={props} context={context} />}
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

const EXAMPLE_SOURCE = `export default ({contentProps, context}) => {
  const { React, useDocument, useHandle } = context
  const [doc, changeDoc] = useDocument(contentProps.documentId)

  const counter = doc?.counter ?? 0
  
  const onClickCounter = () => {
    changeDoc((doc) => {
      doc.counter = counter + 1
    })
  }

  return (
    React.createElement("div", {},
      React.createElement("h1", {}, "My counter"),
      React.createElement("button", {onClick: onClickCounter}, counter)
    )
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
