import Badge from "../../../lib/ui/Badge"
import Content from "../../../lib/blutack/Content"
import { Popover } from "../../../lib/ui/Popover"
import { useDocumentIds } from "../../../lib/blutack/Hooks"
import { openDoc, parseDocumentLink, PushpinUrl } from "../../../lib/blutack/Url"
import ListMenuItem from "../../../lib/ui/ListMenuItem"
import "./ChangedDocsList.css"
import { areHeadsEqual, getLastSeenHeadsMapOfWorkspace } from "../../../lib/blutack/Changes"
import { useSelf, useSelfId } from "../../../lib/blutack/SelfHooks"
import ListMenuSection from "../../../lib/ui/ListMenuSection"
import Button from "../../../lib/ui/Button"
import { DocumentId } from "automerge-repo"
import { useDocument } from "automerge-repo-react-hooks"
import { WorkspaceDoc } from "./Workspace"
import { getHeads, List } from "@automerge/automerge"
import ListItem from "../../../lib/ui/ListItem"
import { HasBadge } from "../../../lenses/HasBadge"
import { readWithSchema } from "../../../lenses"

interface ChangedDocsListProps {
  workspaceDocId: DocumentId
}

export function ChangedDocsList({ workspaceDocId }: ChangedDocsListProps) {
  const [workspaceDoc, changeWorkspaceDoc] = useDocument<WorkspaceDoc>(workspaceDocId)

  const lastSeenHeadsMap = workspaceDoc ? getLastSeenHeadsMapOfWorkspace(workspaceDoc) : {}

  const selfId = useSelfId()
  const [self] = useSelf()

  const trackedDocuments = useDocumentIds(
    Object.keys(lastSeenHeadsMap).map((url) => parseDocumentLink(url).documentId)
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
          workspaceDoc.persistedLastSeenHeads[url as PushpinUrl] = latestHeads as List<string>
        }
      }
    })
  }

  const documentsToNotifyAbout = Object.entries(lastSeenHeadsMap)
    .filter(([documentUrl, lastSeenHeads]) => {
      const rawDoc = trackedDocuments[parseDocumentLink(documentUrl).documentId]

      if (!rawDoc) {
        return false
      }

      const type = parseDocumentLink(documentUrl).type

      const doc = readWithSchema({
        doc: rawDoc,
        type,
        schema: "HasBadge",
        props: {
          lastSeenHeads,
          selfId: selfId,
          selfName: self.name,
        },
      }) as HasBadge

      return doc.notify
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
              <ListMenuItem key={url} onClick={() => openDoc(url as PushpinUrl)}>
                <ListItem>
                  <Content url={url} context="badge" />
                  <Content url={url} context="title" />
                </ListItem>
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
