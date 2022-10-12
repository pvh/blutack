import React from "react"

import Badge from "../../ui/Badge"
import ListItem from "../../ui/ListItem"
import ContentDragHandle from "../../ui/ContentDragHandle"
import { ContentProps } from "../../Content"
import { useDocument } from "automerge-repo-react-hooks"

import { ProjectDoc } from "."
import TitleWithSubtitle from "../../ui/TitleWithSubtitle"
import { PushpinUrl } from "../../pushpin-code/ShareLink"

// todo: try changing the way that "render in a list" works to use our
// schema mapping tool. A project just needs to define a schema mapping
// from a ProjectDoc to a ListItem and then the list renderer
// can take it from there
export function ProjectInList(props: ContentProps) {
  const { documentId } = props
  const [doc] = useDocument<ProjectDoc>(documentId)
  if (!doc) return null

  return (
    <ListItem>
      <ContentDragHandle url={documentId}>
        <Badge icon="list" />
      </ContentDragHandle>
      {/* {doc.name} */}
      <TitleWithSubtitle
        title={doc.name}
        subtitle=""
        editable={false}
        documentId={documentId}
      />
    </ListItem>
  )
}
