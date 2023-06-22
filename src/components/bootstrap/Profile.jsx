import { createContext } from "react"
import { useDocument } from "automerge-repo-react-hooks"

export const ProfileContext = createContext(undefined)

/*

interface ProfileDoc {
  selfId: DocumentId
  contactIds: DocumentId[]
  viewedDocUrls: PushpinUrl[]
  archivedDocUrls: PushpinUrl[]
  contentTypeIds: DocumentId[]
  persistedLastSeenHeads: PersistedLastSeenHeadsMap
}

*/

export default function Profile({ documentId }) {
  const [workspace, changeWorkspace] = useDocument(documentId)

  return (
    <ProfileContext.Provider value={documentId}>
      <div>Hello world</div>
    </ProfileContext.Provider>
  )
}

export function create(_attrs, profileHndle) {
  ContentTypes.create("contact", {}, (selfContentUrl) => {
    const selfDocumentId = parseDocumentLink(selfContentUrl).documentId
    // this is, uh, a nasty hack.
    // we should refactor not to require the DocumentId on the contact
    // but i don't want to pull that in scope right now

    ContentTypes.create("contentlist", { title: "Home" }, (listUrl, listHandle) => {
      listHandle.change((doc) => {
        doc.content.push(threadUrl)
      })
      profileHndle.change((workspace) => {
        workspace.selfId = selfDocumentId
        workspace.contactIds = []
        workspace.currentDocUrl = listUrl
        workspace.viewedDocUrls = [listUrl]
      })
    })
  })
}

export const contentType = {
  type: "profile",
  name: "Profile",
  icon: "briefcase",
  contexts: {
    root: Profile,
  },
  resizable: false,
  unlisted: true,
  create,
};
