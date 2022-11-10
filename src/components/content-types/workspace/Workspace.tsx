import { useEffect, useContext, useRef, useState } from "react"
import Debug from "debug"
import { useDocument } from "automerge-repo-react-hooks"
import { DocumentId, DocHandle } from "automerge-repo"

import {
  parseDocumentLink,
  PushpinUrl,
  isPushpinUrl,
  createDocumentLink,
} from "../../pushpin-code/ShareLink"
import Content, { ContentProps, ContentHandle } from "../../Content"
import * as ContentTypes from "../../pushpin-code/ContentTypes"
import SelfContext from "../../pushpin-code/SelfHooks"
import TitleBar from "./TitleBar"
import { ContactDoc } from "../contact"

// TODO: the navigation API is only available in newish chromes
// we should track down a type for it
declare var navigation: any

import "./Workspace.css"
import {
  useAllHeartbeats,
  useHeartbeat,
  useContactOnlineStatus,
  useDeviceOnlineStatus,
} from "../../pushpin-code/PresenceHooks"

import { BoardDoc, CardId } from "../board"
import { CurrentDeviceContext } from "./Device"

import WorkspaceInList from "./WorkspaceInList"
import { importPlainText } from "../../pushpin-code/ImportData"
import { ContentListDoc } from "../ContentList"
import {
  DocWithViewState,
  loadViewStateForUser,
} from "../../pushpin-code/ViewState"

const log = Debug("pushpin:workspace")

export interface WorkspaceDoc {
  selfId: DocumentId
  contactIds: DocumentId[]
  currentDocUrl: PushpinUrl
  viewedDocUrls: PushpinUrl[]
  archivedDocUrls: PushpinUrl[]
}

interface WorkspaceContentProps extends ContentProps {
  setWorkspaceUrl: (newWorkspaceUrl: PushpinUrl) => void
  createWorkspace: () => void
  initialViewState: { [key: string]: any }
}

export default function Workspace({
  documentId,
  initialViewState,
}: WorkspaceContentProps) {
  const [workspace, changeWorkspace] = useDocument<WorkspaceDoc>(documentId)
  const currentDocId =
    workspace &&
    workspace.currentDocUrl &&
    parseDocumentLink(workspace.currentDocUrl).documentId
  const [currentDoc, changeCurrentDoc] =
    useDocument<DocWithViewState>(currentDocId)

  const currentDeviceId = useContext(CurrentDeviceContext)
  const [self, changeSelf] = useDocument<ContactDoc>(workspace?.selfId)

  const selfId = workspace?.selfId

  const [isCurrentDocUrlChecked, setIsCurrentDocUrlChecked] =
    useState<boolean>(false)
  const [isStateSnapshotChecked, setIsStateSnapshotChecked] =
    useState<boolean>(false)

  if (workspace?.currentDocUrl && !isCurrentDocUrlChecked) {
    setIsCurrentDocUrlChecked(true)
    const maybePushpinUrl = new URLSearchParams(window.location.search).get(
      "document"
    )

    if (isPushpinUrl(maybePushpinUrl)) {
      // this is just to sanitize out any other bits of the URL
      const { scheme, type, documentId } = parseDocumentLink(maybePushpinUrl)
      const docLink = createDocumentLink(type, documentId)
      const currentDocUrl = workspace?.currentDocUrl
      if (docLink !== currentDocUrl) {
        openDoc(docLink)
      }
    }
  }

  if (
    selfId &&
    initialViewState &&
    currentDoc?.__userStates &&
    isCurrentDocUrlChecked &&
    !isStateSnapshotChecked
  ) {
    setIsStateSnapshotChecked(true)

    if (initialViewState) {
      changeCurrentDoc((doc) => {
        loadViewStateForUser(doc, initialViewState, selfId)
      })
    }
  }

  if ("navigation" in window) {
    window.navigation.addEventListener("navigate", (navigateEvent: any) => {
      // Exit early if this navigation shouldn't be intercepted.
      // The properties to look at are discussed later in the article.
      //if (shouldNotIntercept(navigateEvent)) return;

      const destination = new URL(
        navigateEvent.destination.url
      ).searchParams.get("document")
      if (isPushpinUrl(destination)) {
        navigateEvent.intercept({
          handler: async () => {
            openDoc(destination)
          },
        })
      } else {
        console.log("weird URL:", navigateEvent.destination.url)
      }
    })
  }

  useAllHeartbeats(selfId)
  useHeartbeat(selfId)
  useHeartbeat(currentDeviceId)
  useHeartbeat(currentDocId)

  useDeviceOnlineStatus(currentDeviceId)
  useContactOnlineStatus(selfId)

  // TODO: this is so grody
  // Add devices if not already on doc.
  useEffect(() => {
    if (!currentDeviceId || !self || !changeSelf) {
      return
    }

    if (
      currentDeviceId &&
      (!self.devices || !self.devices.includes(currentDeviceId))
    ) {
      changeSelf((doc: ContactDoc) => {
        doc.devices = []
        if (!doc.devices) {
          doc.devices = []
        }
        doc.devices.push(currentDeviceId)
      })
    }
  }, [changeSelf, currentDeviceId, self])

  function openDoc(docUrl: string) {
    if (!isPushpinUrl(docUrl)) {
      return
    }

    const { type } = parseDocumentLink(docUrl)
    if (type === "workspace") {
      // we're going to have to deal with this specially...
      throw new Error("workspace switching isn't supported at the moment")
      return
    }

    if (!workspace) {
      log(
        "Trying to navigate to a document before the workspace doc is loaded!"
      )
      return
    }

    // Reset scroll position
    window.scrollTo(0, 0)

    if (docUrl === workspace.currentDocUrl) {
      log("Attempted to navigate to the same place we already are...")
      return
    }

    changeWorkspace((ws: WorkspaceDoc) => {
      ws.currentDocUrl = docUrl

      ws.viewedDocUrls = ws.viewedDocUrls.filter((url) => url !== docUrl)
      ws.viewedDocUrls.unshift(docUrl)

      if (ws.archivedDocUrls) {
        ws.archivedDocUrls = ws.archivedDocUrls.filter((url) => url !== docUrl)
      }
    })
  }

  /*  function importClip(payload: ClipperPayload) {
    const creationCallback = (importedUrl) => {
      changeWorkspace((d) => {
        d.viewedDocUrls.unshift(importedUrl)
      })
    }

    const { dataUrl, src, capturedAt } = payload

    const dataUrlInfo = DataUrl.parse(dataUrl)
    if (!dataUrlInfo) return
    const { mimeType, data, isBase64 } = dataUrlInfo
    const contentData = {
      mimeType,
      data: isBase64 ? WebStreamLogic.fromBase64(data) : WebStreamLogic.fromString(data),
      src,
      capturedAt,
    }

    if (mimeType.includes('text/plain')) {
      importPlainText(data, creationCallback)
    } else {
      ContentTypes.createFrom(contentData, creationCallback)
    }
  }*/

  const contentRef = useRef<ContentHandle>(null)

  function onContent(url: PushpinUrl) {
    if (contentRef.current) {
      return contentRef.current.onContent(url)
    }
    return false
  }

  if (!workspace) {
    return null
  }

  function renderContent(currentDocUrl?: PushpinUrl) {
    if (!currentDocUrl) {
      return null
    }

    const { type } = parseDocumentLink(currentDocUrl)
    return (
      <div className={`Workspace__container Workspace__container--${type}`}>
        <Content ref={contentRef} context="workspace" url={currentDocUrl} />
      </div>
    )
  }

  const content = renderContent(workspace.currentDocUrl)

  return (
    <SelfContext.Provider value={workspace.selfId}>
      <div className="Workspace">
        <TitleBar
          documentId={documentId}
          openDoc={openDoc}
          onContent={onContent}
        />
        {content}
      </div>
    </SelfContext.Provider>
  )
}
export function create(_attrs: any, handle: DocHandle<any>) {
  ContentTypes.create("contact", {}, (selfContentUrl) => {
    const selfDocumentId = parseDocumentLink(selfContentUrl).documentId
    // this is, uh, a nasty hack.
    // we should refactor not to require the DocumentId on the contact
    // but i don't want to pull that in scope right now

    ContentTypes.create(
      "contentlist",
      { title: "Ink & Switch" },
      (listUrl, listHandle) => {
        ContentTypes.create(
          "thread",
          { title: "#default" },
          (threadUrl, threadHandle) => {
            listHandle.change((doc) => {
              ;(doc as ContentListDoc).content.push(threadUrl)
            })
            handle.change((workspace) => {
              workspace.selfId = selfDocumentId
              workspace.contactIds = []
              workspace.currentDocUrl = listUrl
              workspace.viewedDocUrls = [listUrl]
              console.log("done", workspace)
            })
          }
        )
      }
    )
  })
}

ContentTypes.register({
  type: "workspace",
  name: "Workspace",
  icon: "briefcase",
  contexts: {
    root: Workspace,
    list: WorkspaceInList,
    board: WorkspaceInList,
    "title-bar": WorkspaceInList,
  },
  resizable: false,
  unlisted: true,
  create,
})
