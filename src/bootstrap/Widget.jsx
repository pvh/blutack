import { useEffect, useRef, useState } from "react"
//const { useEffect, useRef, useState } = React

import {ContentTypes, useDocument, Context, Modules, useRepo, Url} from "../lib/blutack"

// const {ContentTypes, useDocument, Context} = Blutack

import {ErrorBoundary} from "react-error-boundary"

/*
export interface WidgetDoc {
  title: string
  source: string
  dist?: string
  error: string | undefined
}
 */

export default function Widget(props) {
  const { documentId } = props
  const [doc, changeDoc] = useDocument(documentId)
  const errorBoundaryRef = useRef(null)
  const [View, setView] = useState(undefined)
  const [profile] = Context.useProfile()
  const repo = useRepo()

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
      const module = await Modules.load(documentId)

      // if widget exports content type add it to list of known content types
      if (module.contentType) {
        const documentUrl = Url.createDocumentLink("widget", documentId)

        const contentTypesListHandle = repo.find(profile.contentTypesListId)
        const contentTypesList = await contentTypesListHandle.value()

        if (!contentTypesList.content.includes(documentUrl)) {
          contentTypesListHandle.change((contentTypesList) => {
            contentTypesList.content.unshift(documentUrl)
          })
        }
      }

      setView(() => module.default)
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
          {View && <View {...props} />}
        </ErrorBoundary>
      </div>
    </div>
  )
}

function fallbackRender({ error }) {
  return (
    <div>
      <p>Something went wrong:</p>
      <pre style={{ color: "red" }}>{error.stack}</pre>
    </div>
  )
}

const EXAMPLE_SOURCE = `const { useDocument } = Blutack

export default ({ documentId }) => {
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

function create(attrs, handle) {
  handle.change((doc) => {
    doc.source = EXAMPLE_SOURCE
  })
}

export const contentType = {
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
