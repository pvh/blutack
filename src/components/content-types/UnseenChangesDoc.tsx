import * as ContentTypes from "../pushpin-code/ContentTypes"
import { DocHandle, DocumentId } from "automerge-repo"
import ListItem from "../ui/ListItem"
import ContentDragHandle from "../ui/ContentDragHandle"
import Badge from "../ui/Badge"
import TitleWithSubtitle from "../ui/TitleWithSubtitle"
import React from "react"
import { ContentProps, EditableContentProps } from "../Content"
import { Heads } from "@automerge/automerge"

function create(unusedAttrs: any, handle: DocHandle<any>) {
  handle.change((doc: UnseenChangesDoc) => {
    doc.headsByDocId = {}
  })
}

export interface UnseenChangesDoc {
  headsByDocId: { [docId: DocumentId]: Heads }
}

function UnseenChanges(props: ContentProps) {
  return <div>TODO: implement UnseenChangesDoc</div>
}

function UnseenChangesInList(props: EditableContentProps) {
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
    workspace: UnseenChanges,
    board: UnseenChanges,
    list: UnseenChangesInList,
    "title-bar": UnseenChangesInList,
  },
  create,
})
