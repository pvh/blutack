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
import { shouldNotifyAboutDocChanges } from "./NotificationSetting"
interface ChangedDocsListProps {
  lastSeenHeadsMap: LastSeenHeadsMap
}

export function ChangedDocsList({ lastSeenHeadsMap }: ChangedDocsListProps) {
  const [self] = useSelf()
  const trackedDocuments = useDocumentIds(
    Object.keys(lastSeenHeadsMap).map(
      (url) => parseDocumentLink(url).documentId
    )
  )

  if (!self) {
    return null
  }

  const documentUrlsWithUnseenMentions = Object.entries(lastSeenHeadsMap)
    .filter(([documentUrl, lastSeenHeads]) => {
      const doc = trackedDocuments[parseDocumentLink(documentUrl).documentId]

      if (!doc) {
        return false
      }

      const type = parseDocumentLink(documentUrl).type

      return shouldNotifyAboutDocChanges(type, doc, lastSeenHeads, self.name)
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
          icon="history"
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
