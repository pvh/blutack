import Badge from "../../ui/Badge"
import React from "react"
import Content from "../../Content"
import { Popover } from "../../ui/Popover"
import { useDocumentIds } from "../../pushpin-code/Hooks"
import { openDoc, parseDocumentLink, PushpinUrl } from "../../pushpin-code/Url"
import ListMenuItem from "../../ui/ListMenuItem"
import "./ChangedDocsList.css"
import {
  areHeadsEqual,
  getLastSeenHeadsMapOfWorkspace,
} from "../../pushpin-code/Changes"
import { useSelf, useSelfId } from "../../pushpin-code/SelfHooks"
import { shouldNotifyAboutDocChanges } from "./NotificationSetting"
import ListMenuSection from "../../ui/ListMenuSection"
import Button from "../../ui/Button"
import { DocumentId } from "automerge-repo"
import { useDocument } from "automerge-repo-react-hooks"
import { WorkspaceDoc } from "./Workspace"
import { getHeads } from "@automerge/automerge"
interface ChangedDocsListProps {
  workspaceDocId: DocumentId
}

export function ChangedDocsList({ workspaceDocId }: ChangedDocsListProps) {
  const [workspaceDoc, changeWorkspaceDoc] =
    useDocument<WorkspaceDoc>(workspaceDocId)

  const lastSeenHeadsMap = workspaceDoc
    ? getLastSeenHeadsMapOfWorkspace(workspaceDoc)
    : {}

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

  const markAllDocumentAsRead = () => {
    changeWorkspaceDoc((workspaceDoc) => {
      workspaceDoc.persistedLastSeenHeads

      for (const [url, lastSeenHead] of Object.entries(lastSeenHeadsMap)) {
        const doc = trackedDocuments[parseDocumentLink(url).documentId]

        if (!doc) {
          continue
        }

        const latestHeads = getHeads(doc)

        if (!areHeadsEqual(latestHeads, lastSeenHead)) {
          workspaceDoc.persistedLastSeenHeads[url as PushpinUrl] = latestHeads
        }
      }
    })
  }

  const documentsToNotifyAbout = Object.entries(lastSeenHeadsMap)
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

  const hasDocumentsToNotifyAbout = documentsToNotifyAbout.length !== 0

  return (
    <Popover
      closeOnClick={true}
      trigger={
        <Badge
          size="medium"
          icon="inbox"
          dot={
            hasDocumentsToNotifyAbout
              ? {
                  color: "var(--colorChangeDot)",
                  number: documentsToNotifyAbout.length,
                }
              : undefined
          }
        />
      }
      alignment="left"
    >
      <ListMenuSection title="Inbox">
        <div className="ChangedDocsList--content">
          {documentsToNotifyAbout.map((url) => {
            return (
              <ListMenuItem
                key={url}
                onClick={() => openDoc(url as PushpinUrl)}
              >
                <Content url={url} context="list" />
              </ListMenuItem>
            )
          })}
          {!hasDocumentsToNotifyAbout && (
            <div className="ChangedDocsList--emptyState">no new changes</div>
          )}
        </div>
      </ListMenuSection>
      {hasDocumentsToNotifyAbout && (
        <div className="ChangedDocsList--footer">
          <Button onClick={markAllDocumentAsRead}>Mark all as read</Button>
        </div>
      )}
    </Popover>
  )
}
