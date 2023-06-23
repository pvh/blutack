import { useDocument, ContentTypes, Url, Content, Context } from "../lib/blutack"
// const { useDocument, ContentTypes, Url, Content, Context } = Blutack
const { ProfileContext } = Context

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
  const activeRoute = Url.useActiveRoute()

  if (!workspace) {
    return null
  }

  return (
    <ProfileContext.Provider value={documentId}>
      <div className="p-4 flex">
        <div className="flex flex-col w-[300px] flex-shrink-0">
          <h1 className="text-xl">Blutack</h1>
          <Content url={workspace.homeDocUrl} />
        </div>
        <div className="flex-1">
          {activeRoute && (
            <Content url={Url.createDocumentLink(activeRoute.type, activeRoute.documentId)} />
          )}
        </div>
      </div>
    </ProfileContext.Provider>
  )
}

export function create(_attrs, profileHandle) {
  ContentTypes.create("contact", {}, (selfContentUrl) => {
    const selfDocumentId = Url.parseDocumentLink(selfContentUrl).documentId
    // this is, uh, a nasty hack.
    // we should refactor not to require the DocumentId on the contact
    // but i don't want to pull that in scope right now

    ContentTypes.create("contentlist", { title: "Home" }, (listUrl, listHandle) => {
      profileHandle.change((profile) => {
        profile.selfId = selfDocumentId
        profile.contactIds = []
        profile.homeDocUrl = listUrl
        profile.viewedDocUrls = [listUrl]
        profile.archivedDocUrls = [listUrl]
        profile.contentTypeIds = [
          "fe1c6cd6-8432-4ac7-8302-f6b16197f5c7", // content list
          "197067ec-0aa2-4d67-80f6-6959d561385b", // text
          "a8d903f9-afc9-41f4-95e7-75193d427e73", // raw
        ]
        profile.persistedLastSeenHeads = {}
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
}
