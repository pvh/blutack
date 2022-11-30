import * as ContentTypes from "../pushpin-code/ContentTypes"
import { DocHandle } from "automerge-repo"
import ListItem from "../ui/ListItem"
import ContentDragHandle from "../ui/ContentDragHandle"
import Badge from "../ui/Badge"
import TitleWithSubtitle from "../ui/TitleWithSubtitle"
import React from "react"
import Content, { ContentProps, EditableContentProps } from "../Content"
import { Heads } from "@automerge/automerge"
import { Popover } from "../ui/Popover"
import { useDocument } from "../../../../automerge-repo/packages/automerge-repo-react-hooks"
import { useDocumentIds } from "../pushpin-code/Hooks"
import { isDocUrlCurrentlyViewed } from "../pushpin-code/Changes"
import { openDoc, parseDocumentLink, PushpinUrl } from "../pushpin-code/Url"
import ListMenuItem from "../ui/ListMenuItem"
import "./UnseenChangesDoc.css"
import { hasTextDocUnseenChanges, TextDoc } from "./TextContent"
import { hasThreadDocUnseenChanges, ThreadDoc } from "./ThreadContent"

function create(unusedAttrs: any, handle: DocHandle<any>) {
  handle.change((doc: UnseenChangesDoc) => {
    doc.headsByDocUrl = {}
  })
}

export interface UnseenChangesDoc {
  headsByDocUrl: { [url: PushpinUrl]: Heads }
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

function UnseenChangesInTitle(props: EditableContentProps) {
  const { documentId } = props
  const [document] = useDocument<UnseenChangesDoc>(documentId)

  const trackedDocuments = useDocumentIds(
    document && document.headsByDocUrl
      ? Object.keys(document.headsByDocUrl).map(
          (url) => parseDocumentLink(url).documentId
        )
      : []
  )

  if (!document || !document.headsByDocUrl) {
    return null
  }

  const documentUrlsWithUnseenChanges = Object.entries(document.headsByDocUrl)
    .filter(([documentUrl, lastSeenHead]) => {
      if (isDocUrlCurrentlyViewed(documentUrl as PushpinUrl)) {
        return false
      }

      const doc = trackedDocuments[parseDocumentLink(documentUrl).documentId]

      if (!doc) {
        return false
      }

      // todo: this is not great that we hardcode all supported document types here
      switch (parseDocumentLink(documentUrl).type) {
        case "thread":
          return hasThreadDocUnseenChanges(doc as ThreadDoc, lastSeenHead)

        case "text":
          return hasTextDocUnseenChanges(doc as TextDoc, lastSeenHead)

        default:
          return false
      }
    })
    .map(([url]) => url)

  const hasDocumentsWithUnseenChanges =
    documentUrlsWithUnseenChanges.length !== 0

  return (
    <Popover
      closeOnClick={true}
      trigger={
        <Badge
          size="medium"
          icon="bell"
          dot={
            hasDocumentsWithUnseenChanges
              ? {
                  color: "var(--colorChangeDot)",
                  number: documentUrlsWithUnseenChanges.length,
                }
              : undefined
          }
        />
      }
      alignment="right"
    >
      {documentUrlsWithUnseenChanges.map((url) => {
        return (
          <ListMenuItem key={url} onClick={() => openDoc(url as PushpinUrl)}>
            <Content url={url} context="list" />
          </ListMenuItem>
        )
      })}
      {!hasDocumentsWithUnseenChanges && (
        <div className="UnseenChangesDoc-emptyState">no new changes</div>
      )}
    </Popover>
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
    "title-bar": UnseenChangesInTitle,
  },
  create,
})
