import Badge from "../../ui/Badge"
import React from "react"
import Content from "../../Content"
import { Popover } from "../../ui/Popover"
import { useDocumentIds } from "../../pushpin-code/Hooks"
import { openDoc, parseDocumentLink, PushpinUrl } from "../../pushpin-code/Url"
import ListMenuItem from "../../ui/ListMenuItem"
import "./ChangedDocsList.css"
import { LastSeenHeadsMap } from "../../pushpin-code/Changes"
import { useSelf, useSelfId } from "../../pushpin-code/SelfHooks"
import { shouldNotifyAboutDocChanges } from "./NotificationSetting"
import ListMenuSection from "../../ui/ListMenuSection"
interface ChangedDocsListProps {
  lastSeenHeadsMap: LastSeenHeadsMap
}

export function ChangedDocsList({ lastSeenHeadsMap }: ChangedDocsListProps) {
  const selfId = useSelfId()
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

      return shouldNotifyAboutDocChanges(
        type,
        doc,
        lastSeenHeads,
        selfId,
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
          icon="inbox"
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
      alignment="right"
    >
      <ListMenuSection title="Inbox">
        <div className="ChangedDocsList--content">
          {documentUrlsWithUnseenMentions.map((url) => {
            return (
              <ListMenuItem
                key={url}
                onClick={() => openDoc(url as PushpinUrl)}
              >
                <Content url={url} context="list" />
              </ListMenuItem>
            )
          })}
          {!hasDocumentsWithUnseenMentions && (
            <div className="UnseenChangesDoc-emptyState">no new changes</div>
          )}
        </div>
      </ListMenuSection>
    </Popover>
  )
}
