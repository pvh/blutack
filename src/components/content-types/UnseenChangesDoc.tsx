import * as ContentTypes from "../pushpin-code/ContentTypes"
import { DocHandle } from "../../../../automerge-repo"
import ListItem from "../ui/ListItem"
import ContentDragHandle from "../ui/ContentDragHandle"
import Badge from "../ui/Badge"
import TitleWithSubtitle from "../ui/TitleWithSubtitle"
import React from "react"
import { EditableContentProps } from "../Content"

function create(unusedAttrs: any, handle: DocHandle<any>) {
  handle.change((doc) => {
    doc.votesByTitle = {}
    doc.isSorted = false
  })
}

function UnseenChangesDoc() {
  return <div>TODO: implement UnseenChangesDoc</div>
}

function UnseenChangesDocInList(props: EditableContentProps) {
  const { documentId, url } = props

  return (
    <ListItem>
      <ContentDragHandle url={url}>
        <Badge size="medium" icon="bell" />
      </ContentDragHandle>
      <TitleWithSubtitle title="Unseen changes" documentId={documentId} />
    </ListItem>
  )
}

ContentTypes.register({
  type: "unseenChangesDoc",
  name: "Unseen changes",
  icon: "bell",
  unlisted: true,
  contexts: {
    workspace: UnseenChangesDoc,
    board: UnseenChangesDoc,
    list: UnseenChangesDocInList,
    "title-bar": UnseenChangesDocInList,
  },
  create,
})
