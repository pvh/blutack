import { useEffect, useContext, useRef } from "react"
import Debug from "debug"
import { useDocument } from "automerge-repo-react-hooks"
import { DocumentId, DocHandle } from "automerge-repo"

import { parseDocumentLink, PushpinUrl } from "../../pushpin-code/ShareLink"
import Content, { ContentProps, ContentHandle } from "../../Content"
import * as ContentTypes from "../../pushpin-code/ContentTypes"
import SelfContext from "../../pushpin-code/SelfHooks"
import TitleBar from "./TitleBar"
import { ContactDoc } from "../contact"

import "./Workspace.css"
import {
  useAllHeartbeats,
  useHeartbeat,
  useContactOnlineStatus,
  useDeviceOnlineStatus,
} from "../../pushpin-code/PresenceHooks"

import { CurrentDeviceContext } from "./Device"

import WorkspaceInList from "./WorkspaceInList"
import { ContentListDoc } from "../ContentList"
import { storeCurrentUrlOfUser } from "../../Url"
import { ViewStateContext } from "../../pushpin-code/ViewState"

const log = Debug("pushpin:workspace")

export interface WorkspaceDoc {
  selfId: DocumentId
  contactIds: DocumentId[]
  viewedDocUrls: PushpinUrl[]
  archivedDocUrls: PushpinUrl[]
}

export interface DocumentWithTitle {
  title?: string
}

interface WorkspaceContentProps extends ContentProps {
  currentDocUrl?: PushpinUrl
  setWorkspaceUrl: (newWorkspaceUrl: PushpinUrl) => void
  createWorkspace: () => void
}

export default function Workspace({
  documentId,
  currentDocUrl,
}: WorkspaceContentProps) {
  const [workspace, changeWorkspace] = useDocument<WorkspaceDoc>(documentId)
  const currentDocId =
    currentDocUrl && parseDocumentLink(currentDocUrl).documentId
  const [currentDoc, changeCurrentDoc] =
    useDocument<DocumentWithTitle>(currentDocId)

  const currentDeviceId = useContext(CurrentDeviceContext)
  const [self, changeSelf] = useDocument<ContactDoc>(workspace?.selfId)
  const viewState = useContext(ViewStateContext)

  const selfId = workspace?.selfId

  useAllHeartbeats(selfId)
  useHeartbeat(selfId)
  useHeartbeat(currentDeviceId)
  useHeartbeat(currentDocId)

  useDeviceOnlineStatus(currentDeviceId)
  useContactOnlineStatus(selfId)

  const currentDocTitle = currentDoc && currentDoc.title

  // reflect title of current document in title bar of webpage
  useEffect(() => {
    document.title = currentDocTitle ?? "Blutack"
  }, [currentDocTitle])

  // store currentDocUrl in viewedDocUrls
  useEffect(() => {
    if (!currentDocUrl) {
      return
    }

    changeWorkspace((ws: WorkspaceDoc) => {
      ws.viewedDocUrls = ws.viewedDocUrls.filter((url) => url !== currentDocUrl)
      ws.viewedDocUrls.unshift(currentDocUrl)

      if (ws.archivedDocUrls) {
        ws.archivedDocUrls = ws.archivedDocUrls.filter(
          (url) => url !== currentDocUrl
        )
      }
    })
  }, [currentDocUrl])

  // store currentUrl of user in document
  useEffect(() => {
    if (!selfId) {
      return
    }

    changeCurrentDoc((doc) => {
      storeCurrentUrlOfUser(doc as any, selfId)
    })
  }, [selfId, currentDocUrl, viewState])

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

  const content = currentDocUrl && renderContent(currentDocUrl)

  return (
    <SelfContext.Provider value={workspace.selfId}>
      <div className="Workspace">
        <TitleBar
          currentDocUrl={currentDocUrl}
          workspaceDocId={documentId}
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
