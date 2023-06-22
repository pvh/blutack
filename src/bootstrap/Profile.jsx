import { createContext } from "react"
import { useDocument } from "automerge-repo-react-hooks"
import * as ContentTypes from "../components/pushpin-code/ContentTypes"
import {
  createDocumentLink,
  parseDocumentLink,
  useActiveRoute,
} from "../components/pushpin-code/Url"
import Content from "../components/Content"

export const ProfileContext = createContext(undefined)

/*

interface ProfileDoc {
  selfId: DocumentId
  contactIds: DocumentId[]
  homeDocUrl: DocumentId,
  viewedDocUrls: PushpinUrl[]
  archivedDocUrls: PushpinUrl[]
  contentTypeIds: DocumentId[]
  persistedLastSeenHeads: PersistedLastSeenHeadsMap
}

*/

export default function Profile({ documentId }) {
  const [workspace] = useDocument(documentId)
  const activeRoute = useActiveRoute()

  if (!workspace) {
    return null
  }

  return (
    <ProfileContext.Provider value={documentId}>
      <div className="p-4 flex">
        <div className="flex flex-col max-w-[300px]">
          <h1 className="text-xl">Blutack</h1>
          <Content url={workspace.homeDocUrl} />
        </div>
        {activeRoute && (
          <Content url={createDocumentLink(activeRoute.type, activeRoute.documentId)} />
        )}
      </div>
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
      ContentTypes.create(
        "text",
        {
          title: "Home",
          text: "Hello world!",
        },
        (textUrl) => {
          listHandle.change((doc) => {
            doc.content.push(textUrl)
          })
          profileHndle.change((profile) => {
            profile.selfId = selfDocumentId
            profile.contactIds = []
            profile.homeDocUrl = listUrl
            profile.viewedDocUrls = [listUrl]
            profile.archivedDocUrls = [listUrl]
            profile.contentTypeIds = []
            profile.persistedLastSeenHeads = {}
          })
        }
      )
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
}
