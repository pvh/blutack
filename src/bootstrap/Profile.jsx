import { Content, ContentTypes, Context, Url, useDocument } from "../lib/blutack"
import { createDocumentLink } from "../lib/blutack/Url"
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

export default function ProfileRoot({ documentId }) {
  const [profile] = useDocument(documentId)
  const activeRoute = Url.useActiveRoute()

  if (!profile) {
    return null
  }

  return (
    <ProfileContext.Provider value={documentId}>
      <div className="p-4 flex">
        <div className="flex flex-col w-[300px] flex-shrink-0">
          <h1 className="text-xl">Blutack</h1>
          <Content url={profile.homeDocUrl} />
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

export function ProfileExpanded({ documentId }) {
  const [profile] = useDocument(documentId)

  if (!profile) {
    return null
  }

  return (
    <div className="p-4 flex flex-col gap-2">
      <h1 className="text-xl">Profile</h1>

      <div>
        <h2 className="text-md">Content Types</h2>
        <Content url={Url.createDocumentLink("contentlist", profile.contentTypesListId)} />
      </div>
    </div>
  )
}

export function create(_attrs, profileHandle) {
  ContentTypes.create("contact", {}, (selfContentUrl) => {
    const selfDocumentId = Url.parseDocumentLink(selfContentUrl).documentId
    // this is, uh, a nasty hack.
    // we should refactor not to require the DocumentId on the contact
    // but i don't want to pull that in scope right now

    ContentTypes.create("contentlist", { title: "Home" }, (homeDocUrl, homeDocHandle) => {
      console.log("add own thing")

      homeDocHandle.change((homeDoc) => {
        console.log("home doc", JSON.parse(JSON.stringify(homeDoc)))

        homeDoc.content.push(Url.createDocumentLink("profile", profileHandle.documentId))
      })

      ContentTypes.create(
        "contentlist",
        { title: "Content Types" },
        (contentTypesListUrl, contentTypesListHandle) => {
          contentTypesListHandle.change((contentTypesList) => {
            contentTypesList.content = [
              createDocumentLink("widget", "fe1c6cd6-8432-4ac7-8302-f6b16197f5c7"), // content list
              createDocumentLink("widget", "197067ec-0aa2-4d67-80f6-6959d561385b"), // text
              createDocumentLink("widget", "a8d903f9-afc9-41f4-95e7-75193d427e73"), // raw
            ]
          })

          profileHandle.change((profile) => {
            profile.title = "Profile"
            profile.selfId = selfDocumentId
            profile.contactIds = []
            profile.homeDocUrl = homeDocUrl
            profile.viewedDocUrls = [homeDocUrl]
            profile.archivedDocUrls = [homeDocUrl]
            profile.contentTypesListId = contentTypesListHandle.documentId
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
    root: ProfileRoot,
    expanded: ProfileExpanded,
  },
  resizable: false,
  unlisted: true,
  create,
}
