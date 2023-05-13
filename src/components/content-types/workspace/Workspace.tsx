import { createContext, useContext, useEffect, useRef } from "react"
import Debug from "debug"
import { useDocument } from "automerge-repo-react-hooks"
import { DocHandle, DocumentId } from "automerge-repo"

import { parseDocumentLink, PushpinUrl, storeCurrentUrlOfUser } from "../../pushpin-code/Url"
import Content, { ContentHandle, ContentProps } from "../../Content"
import * as ContentTypes from "../../pushpin-code/ContentTypes"
import { ContentType } from "../../pushpin-code/ContentTypes"
import SelfContext from "../../pushpin-code/SelfHooks"
import TitleBar from "./TitleBar"
import { ContactDoc } from "../contact"

import "./Workspace.css"
import {
  useAllHeartbeats,
  useContactOnlineStatus,
  useDeviceOnlineStatus,
  useHeartbeat,
} from "../../pushpin-code/PresenceHooks"

import { CurrentDeviceContext } from "./Device"

import WorkspaceInList from "./WorkspaceInList"
import { ContentListDoc } from "../ContentList"
import { ViewStateContext } from "../../pushpin-code/ViewState"
import { PersistedLastSeenHeadsMap } from "../../pushpin-code/Changes"
import { useMentionAutocompletion } from "../../pushpin-code/Searches"

const log = Debug("pushpin:workspace")

export const WorkspaceContext = createContext<DocumentId | undefined>(undefined)

export interface WorkspaceDoc {
  selfId: DocumentId
  contactIds: DocumentId[]
  viewedDocUrls: PushpinUrl[]
  archivedDocUrls: PushpinUrl[]
  persistedLastSeenHeads: PersistedLastSeenHeadsMap
}

export interface DocumentWithTitle {
  title?: string
}

interface WorkspaceContentProps extends ContentProps {
  currentDocUrl?: PushpinUrl
  setWorkspaceUrl: (newWorkspaceUrl: PushpinUrl) => void
  createWorkspace: () => void
}

export default function Workspace({ documentId, currentDocUrl }: WorkspaceContentProps) {
  const [workspace, changeWorkspace] = useDocument<WorkspaceDoc>(documentId)
  const currentDocId = currentDocUrl && parseDocumentLink(currentDocUrl).documentId
  const [currentDoc, changeCurrentDoc] = useDocument<DocumentWithTitle>(currentDocId)

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

  useMentionAutocompletion(documentId)

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

    const contentType = ContentTypes.typeNameToContentType(parseDocumentLink(currentDocUrl).type)
    if (contentType?.dontAddToViewedDocUrls) {
      return
    }

    if (!workspace) { console.log('tried to set the currentDocUrl too early'); return }
    
    if (workspace.viewedDocUrls[0] === currentDocUrl) { return }
    changeWorkspace((ws: WorkspaceDoc) => {
      ws.viewedDocUrls = ws.viewedDocUrls.filter((url) => url !== currentDocUrl)
      ws.viewedDocUrls.unshift(currentDocUrl)

      if (ws.archivedDocUrls) {
        ws.archivedDocUrls = ws.archivedDocUrls.filter((url) => url !== currentDocUrl)
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

    if (currentDeviceId && (!self.devices || !self.devices.includes(currentDeviceId))) {
      changeSelf((doc: ContactDoc) => {
        if (!doc.devices) {
          doc.devices = []
        }
        doc.devices.push(currentDeviceId)
      })
    }
  }, [changeSelf, currentDeviceId, self])

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
        <Content ref={contentRef} context="expanded" url={currentDocUrl} />
      </div>
    )
  }

  const content = currentDocUrl && renderContent(currentDocUrl)

  return (
    <WorkspaceContext.Provider value={documentId}>
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
    </WorkspaceContext.Provider>
  )
}
export function create(_attrs: any, handle: DocHandle<any>) {
  ContentTypes.create("contact", {}, (selfContentUrl) => {
    const selfDocumentId = parseDocumentLink(selfContentUrl).documentId
    // this is, uh, a nasty hack.
    // we should refactor not to require the DocumentId on the contact
    // but i don't want to pull that in scope right now

    ContentTypes.create("contentlist", { title: "Ink & Switch" }, (listUrl, listHandle) => {
      ContentTypes.create("thread", { title: "#default" }, (threadUrl, threadHandle) => {
        listHandle.change((doc) => {
          ;(doc as ContentListDoc).content.push(threadUrl)
        })
        handle.change((workspace) => {
          workspace.selfId = selfDocumentId
          workspace.contactIds = []
          workspace.currentDocUrl = listUrl
          workspace.viewedDocUrls = [listUrl]
        })
      })
    })
  })
}

export const contentType: ContentType = {
  type: "workspace",
  name: "Workspace",
  icon: "briefcase",
  contexts: {
    root: Workspace,
    board: WorkspaceInList,
  },
  resizable: false,
  unlisted: true,
  create,
}
