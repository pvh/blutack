import { DocumentId } from "@automerge/automerge-repo"
import { useDocument } from "@automerge/automerge-repo-react-hooks"
import { useDocumentIds, useDocuments } from "../../../pushpin-code/Hooks"
import { PushpinUrl } from "../../../pushpin-code/Url"
import { ContactDoc } from "../../contact"
import { WorkspaceDoc } from "../Workspace"

/***
 * useInvitations(workspaceDoc, selfId)
 *
 * This one is a bit tricky, so buckle up.
 *
 * We keep track of any contacts we encounter on the workspace.
 * Contacts (including our own) have a map of "invites" from { contactId: PushpinUrl[] }.
 * (Ideally, and formerly, these were encrypted, but we could reconsider this design.)
 * Before we try to show a user an invite, we use this hook to go and load both
 *  - the sending contact (so we can say who sent it) and
 *  - the actual sent document (but not its children)
 *
 *  workspace         contact
 * ┌─────────────┐   ┌──────────────────────────┐   ┌──────────────────────┐
 * │ contactIds[]├──►│ .invites {               ├──►│                      │
 * │ selfId      │   │   <selfId>: PushpinUrl[] │   │ <literally any doc>  │
 * │ ...         │   │ }                        │   │                      │
 * └─────────────┘   └──────────────────────────┘   └──────────────────────┘
 *
 */

export interface Invitation {
  senderId: DocumentId
  sender: ContactDoc
  docUrl: PushpinUrl
  doc?: any
}

export default function useInvitations(workspaceId: DocumentId) {
  const [workspace] = useDocument<WorkspaceDoc>(workspaceId)
  const contactDocs = useDocumentIds<ContactDoc>(workspace?.contactIds)

  const selfId = workspace?.selfId || ""

  let allInvites: Invitation[] = []

  for (var senderId in contactDocs) {
    // grab any invites for us from this contact
    const inviteUrls =
      (contactDocs[senderId as DocumentId].invites || {})[selfId] || []

    // map them into an object including the sender
    const invites = inviteUrls.map((i) => ({
      senderId: senderId as DocumentId,
      sender: contactDocs[senderId as DocumentId],
      docUrl: i,
    }))

    // append them to our growing list of invites
    allInvites = allInvites.concat(invites)
  }

  const invitedDocs = useDocuments<unknown>(allInvites.map((i) => i.docUrl))

  const loadedInvites = allInvites
    .map((i) => ({ ...i, doc: invitedDocs[i.docUrl] }))
    .filter((i) => i.doc) // only return ones which have a loaded document

  return loadedInvites
}
