import React, { ChangeEventHandler, useMemo } from "react"
import { ContentType } from "../pushpin-code/ContentTypes"
import { useDocument } from "automerge-repo-react-hooks"
import { ContentProps } from "../Content"
import { DocHandle } from "automerge-repo"
import { html } from "htm/react"

export interface WidgetDoc {
  title: string
  source: string
}

export default function Widget(props: ContentProps) {
  const [doc, changeDoc] = useDocument<WidgetDoc>(props.documentId)

  const source = doc?.source

  const View: Function | undefined = useMemo(() => {
    if (!source) {
      return undefined
    }

    return new Function("context", `with (context) { return ${doc.source} }`)({
      html,
    })
  }, [source])

  if (!doc) {
    return null
  }

  const onChangeSource: ChangeEventHandler<HTMLTextAreaElement> = (evt) => {
    changeDoc((doc) => {
      doc.source = evt.target.value
    })
  }

  return (
    <div>
      <textarea value={doc.source} onChange={onChangeSource} />
      <hr />
      {View && <View doc={doc} changeDoc={changeDoc} />}
    </div>
  )
}

const EXAMPLE_SOURCE = `() => {
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
