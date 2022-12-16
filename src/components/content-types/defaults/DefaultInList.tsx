import React from "react"
import * as ContentTypes from "../../pushpin-code/ContentTypes"
import Content, { ContentProps } from "../../Content"
import ListItem from "../../ui/ListItem"
import { useDocument } from "automerge-repo-react-hooks"

interface Doc {
  title?: string
}

export default function DefaultInList(props: ContentProps) {
  const { url, documentId } = props
  const [doc] = useDocument<Doc>(documentId)

  if (!doc) {
    return null
  }

  return (
    <ListItem>
      <Content url={url} context="badge" />
      <Content url={url} context="title" />
    </ListItem>
  )
}

ContentTypes.registerDefault({
  component: DefaultInList,
  context: "list",
})
