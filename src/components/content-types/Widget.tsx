import React, { useEffect, useRef, useState } from "react"
import * as ContentTypes from "../pushpin-code/ContentTypes"
import { ContentType } from "../pushpin-code/ContentTypes"
import { useDocument } from "automerge-repo-react-hooks"
import { ContentProps } from "../Content"
import { DocHandle, DocumentId } from "automerge-repo"
import { ErrorBoundary } from "react-error-boundary"
import "./Widget.css"
import { BinaryDataId, createBinaryDataUrl } from "../../blobstore/Blob"
import { useWorkspace } from "./workspace/Workspace"

export interface WidgetDoc {
  title: string
  source: string
  dist?: string
  error: string | undefined
}

export async function loadWidgetModule(documentId: DocumentId) {
  const module = await import(
    createBinaryDataUrl(
      `web+binarydata://${documentId}?rand=${Math.random()}` as unknown as BinaryDataId
    )
  )

  if (module.contentType) {
    ContentTypes.register(module.contentType)
  }

  return module
}

export default function Widget(props: ContentProps) {
  const { documentId } = props
  const [doc, changeDoc] = useDocument<WidgetDoc>(documentId)
  const errorBoundaryRef = useRef<ErrorBoundary | null>(null)
  const [View, setView] = useState<Function | undefined>(undefined)
  const [workspace, changeWorkspace] = useWorkspace()

  const source = doc?.source

  useEffect(() => {
    if (!source) {
      return undefined
    }

    if (errorBoundaryRef.current) {
      errorBoundaryRef.current.resetErrorBoundary()
    }

    console.log("source change effect")
    ;(async () => {
      // fetch ourselves as an ES module
      const module = await loadWidgetModule(documentId)

      // if widget exports content type add it to list of known content types
      if (module.contentType) {
        const contentTypeDocIds = workspace?.contentTypeIds ?? []
        if (!contentTypeDocIds.includes(documentId)) {
          changeWorkspace((workspace) => {
            // todo: fix types
            ;(workspace.contentTypeIds as any) = []
            workspace.contentTypeIds.push(documentId)
          })
        }
      }

      setView(() => module.default)
    })()
  }, [source])

  if (!doc) {
    return null
  }

  console.log({ View })

  return (
    <div
      className="Widget"
      onDoubleClick={(evt) => evt.stopPropagation()}
      onPaste={(evt) => evt.stopPropagation()}
    >
      <div className="Widget-content">
        <ErrorBoundary fallbackRender={fallbackRender} ref={errorBoundaryRef}>
          {View && <View {...props} />}
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

const EXAMPLE_SOURCE = `export default ({ documentId }) => {
   const [doc, changeDoc] = useDocument(documentId)

  const counter = doc ? doc.counter ?? 0 : 0

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
