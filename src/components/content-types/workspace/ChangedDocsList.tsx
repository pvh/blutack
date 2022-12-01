import Badge from "../../ui/Badge"
import React from "react"
import Content, { ContentProps, EditableContentProps } from "../../Content"
import { Popover } from "../../ui/Popover"
import { useDocumentIds } from "../../pushpin-code/Hooks"
import { openDoc, parseDocumentLink, PushpinUrl } from "../../pushpin-code/Url"
import ListMenuItem from "../../ui/ListMenuItem"
import "./ChangedDocsList.css"
import { LastSeenHeadsMap } from "../../pushpin-code/Changes"
import * as ContentTypes from "../../pushpin-code/ContentTypes"
import { Doc } from "@automerge/automerge"
interface ChangedDocsListProps {
  lastSeenHeads: LastSeenHeadsMap
}

export function ChangedDocsList({ lastSeenHeads }: ChangedDocsListProps) {
  const trackedDocuments = useDocumentIds(
    Object.keys(lastSeenHeads).map((url) => parseDocumentLink(url).documentId)
  )

  const documentUrlsWithUnseenChanges = Object.entries(lastSeenHeads)
    .filter(([documentUrl, lastSeenHead]) => {
      const doc = trackedDocuments[parseDocumentLink(documentUrl).documentId]

      if (!doc) {
        return false
      }

      const contentType = ContentTypes.typeNameToContentType(
        parseDocumentLink(documentUrl).type
      )

      if (!contentType || !contentType.hasUnseenChanges) {
        return false
      }
      return contentType.hasUnseenChanges(doc as Doc<unknown>, lastSeenHead)
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
