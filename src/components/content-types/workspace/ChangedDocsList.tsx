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
import { useSelf } from "../../pushpin-code/SelfHooks"
interface ChangedDocsListProps {
  lastSeenHeads: LastSeenHeadsMap
}

export function ChangedDocsList({ lastSeenHeads }: ChangedDocsListProps) {
  const [self] = useSelf()
  const trackedDocuments = useDocumentIds(
    Object.keys(lastSeenHeads).map((url) => parseDocumentLink(url).documentId)
  )

  if (!self) {
    return null
  }

  const documentUrlsWithUnseenMentions = Object.entries(lastSeenHeads)
    .filter(([documentUrl, lastSeenHead]) => {
      const doc = trackedDocuments[parseDocumentLink(documentUrl).documentId]

      if (!doc) {
        return false
      }

      const contentType = ContentTypes.typeNameToContentType(
        parseDocumentLink(documentUrl).type
      )

      if (!contentType || !contentType.hasUnseenMentions) {
        return false
      }
      return contentType.hasUnseenMentions(
        doc as Doc<unknown>,
        lastSeenHead,
        self.name
      )
    })
    .map(([url]) => url)

  const hasDocumentsWithUnseenMentions =
    documentUrlsWithUnseenMentions.length !== 0

  return (
    <Popover
      closeOnClick={true}
      trigger={
        <Badge
          size="medium"
          icon="bell"
          dot={
            hasDocumentsWithUnseenMentions
              ? {
                  color: "var(--colorChangeDot)",
                  number: documentUrlsWithUnseenMentions.length,
                }
              : undefined
          }
        />
      }
      placement="bottom"
    >
      {documentUrlsWithUnseenMentions.map((url) => {
        return (
          <ListMenuItem key={url} onClick={() => openDoc(url as PushpinUrl)}>
            <Content url={url} context="list" />
          </ListMenuItem>
        )
      })}
      {!hasDocumentsWithUnseenMentions && (
        <div className="UnseenChangesDoc-emptyState">no new changes</div>
      )}
    </Popover>
  )
}
