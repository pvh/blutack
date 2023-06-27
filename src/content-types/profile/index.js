const { useDocument, ContentTypes, Url, Content, Context } = Blutack
const { ProfileContext } = Context

/*

interface ProfileDoc {
  selfId: DocumentId
  contactIds: DocumentId[]
  homeDocUrl: DocumentId,
  viewedDocUrls: PushpinUrl[]
  contentTypeIds: DocumentId[]
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
        <Content
          url={Url.createDocumentLink("contentlist", profile.contentTypesListId)}
          disableOpenOnClick={true}
        />
      </div>
    </div>
  )
}

export function create({ baseContentTypeIds }, profileHandle) {
  ContentTypes.create("contact", {}, (selfContentUrl) => {
    const selfDocumentId = Url.parseDocumentLink(selfContentUrl).documentId
    // this is, uh, a nasty hack.
    // we should refactor not to require the DocumentId on the contact
    // but i don't want to pull that in scope right now

    ContentTypes.create("contentlist", { title: "Home" }, (homeDocUrl, homeDocHandle) => {
      homeDocHandle.change((homeDoc) => {
        homeDoc.content.push(Url.createDocumentLink("profile", profileHandle.documentId))
      })

      ContentTypes.create(
        "contentlist",
        { title: "Content Types" },
        (contentTypesListUrl, contentTypesListHandle) => {
          contentTypesListHandle.change((contentTypesList) => {
            contentTypesList.content = baseContentTypeIds.map((id) =>
              Url.createDocumentLink("widget", id)
            )
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
