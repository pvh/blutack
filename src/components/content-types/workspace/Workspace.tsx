import React, { useEffect, useContext, useRef } from 'react'
import Debug from 'debug'
import * as uuid from 'uuid'
import { useDocument } from 'automerge-repo-react-hooks'
import { DocumentId, DocHandle } from 'automerge-repo'

import { parseDocumentLink, PushpinUrl, isPushpinUrl } from '../../pushpin-code/ShareLink'
import Content, { ContentProps, ContentHandle } from '../../Content'
import * as ContentTypes from '../../pushpin-code/ContentTypes'
import SelfContext from '../../pushpin-code/SelfHooks'
import TitleBar from './TitleBar'
import { ContactDoc } from '../contact'
import * as WebStreamLogic from '../../pushpin-code/WebStreamLogic'

// TODO: the navigation API is only available in newish chromes
// we should track down a type for it
declare var navigation: any

import './Workspace.css'
/* import {
  useAllHeartbeats,
  useHeartbeat,
  useContactOnlineStatus,
  useDeviceOnlineStatus,
} from '../../../PresenceHooks' */

import { BoardDoc, CardId } from '../board'
// import { useSystem } from '../../../System'
import { CurrentDeviceContext } from './Device'

import WorkspaceInList from './WorkspaceInList'
import { importPlainText } from '../../pushpin-code/ImportData'
// import * as DataUrl from '../../../../DataUrl'

const log = Debug('pushpin:workspace')

export interface WorkspaceDoc {
  selfId: DocumentId
  contactIds: DocumentId[]
  currentDocUrl: PushpinUrl
  viewedDocUrls: PushpinUrl[]
  archivedDocUrls: PushpinUrl[]
  // secretKey?: Crypto.SignedMessage<Crypto.EncodedSecretEncryptionKey>
}

interface WorkspaceContentProps extends ContentProps {
  setWorkspaceUrl: (newWorkspaceUrl: PushpinUrl) => void
  createWorkspace: () => void
}

interface ClipperPayload {
  src: string
  dataUrl: string
  capturedAt: string
}

export default function Workspace({ documentId, selfId }: WorkspaceContentProps) {
  // const crypto = useCrypto()
  const [workspace, changeWorkspace] = useDocument<WorkspaceDoc>(documentId)
  const currentDeviceUrl = useContext(CurrentDeviceContext)
  const [self, changeSelf] = useDocument<ContactDoc>(selfId || undefined)

  console.log(navigation)
  
  navigation.addEventListener('navigate', (navigateEvent: any) => {
    // Exit early if this navigation shouldn't be intercepted.
    // The properties to look at are discussed later in the article.
    //if (shouldNotIntercept(navigateEvent)) return;
  
    console.log(navigateEvent)

    const url = new URL(navigateEvent.destination.url);
    console.log(navigateEvent.destination.url)
  
    navigateEvent.intercept({handler: async () => {
      openDoc(url.pathname)
    }});
  });

  /*
  const selfId: DocumentId | undefined = workspace && workspace.selfId
   const currentDocUrl =
    workspace && workspace.currentDocUrl && parseDocumentLink(workspace.currentDocUrl).documentId

  const [self, changeSelf] = useDocument<ContactDoc>(selfId)
  const currentDeviceId = currentDeviceUrl
    ? parseDocumentLink(currentDeviceUrl).documentId
    : null

  useAllHeartbeats(selfId)
  useHeartbeat(selfId)
  useHeartbeat(currentDeviceId)
  useHeartbeat(currentDocUrl)

  useDeviceOnlineStatus(currentDeviceId)
  useContactOnlineStatus(selfId)
  */

  /* const sendToSystem = useSystem(
    (msg) => {
      switch (msg.type) {
        case 'IncomingUrl':
          openDoc(msg.url)
          break
        case 'IncomingClip':
          importClip(msg.payload)
          break
        case 'NewDocument':
          if (!selfId) break
          ContentTypes.create('board', { selfId }, (boardUrl: PushpinUrl) => {
            openDoc(boardUrl)
          })
          break
        case 'NewWorkspace':
          props.createWorkspace()
          break
      }
    },
    [selfId]
  ) 

  useEffect(() => {
    // For background debugging:
    if (currentDocUrl) sendToSystem({ type: 'Navigated', url: currentDocUrl })
  }, [currentDocUrl, sendToSystem])
  */

  // Add devices if not already on doc.
  useEffect(() => {
    if (!currentDeviceUrl || !self || !changeSelf) {
      return
    }

    const { documentId } = parseDocumentLink(currentDeviceUrl)
    if (!self.devices || !self.devices.includes(documentId)) {
      changeSelf((doc: ContactDoc) => {
        if (!doc.devices) {
          doc.devices = []
        }
        doc.devices.push(documentId)
      })
    }
  }, [changeSelf, currentDeviceUrl, self])

  // Add encryption keys if not already on doc.
  /*
  useEffect(() => {
    if (!workspace || !selfId || workspace.secretKey) return

    try {
      migrateEncryptionKeys()
    } catch {
      console.log(
        'Unable to set encryption keys on workspace. Must be on the device which created the workspace.'
      )
    }

    async function migrateEncryptionKeys() {
      if (!workspace || !selfId || workspace.secretKey) return
      const encryptionKeyPair = await crypto.encryptionKeyPair()
      const signedPublicKey = await crypto.sign(selfId, encryptionKeyPair.publicKey)
      const signedSecretKey = await crypto.sign(props.documentId, encryptionKeyPair.secretKey)
      changeSelf((doc: ContactDoc) => {
        doc.encryptionKey = signedPublicKey
      })
      changeWorkspace((doc: Doc) => {
        doc.secretKey = signedSecretKey
      })
    }
  }, [workspace, selfId, workspace && workspace.secretKey])
  */

  function openDoc(docUrl: string) {
    if (!isPushpinUrl(docUrl)) {
      return
    }

    const { type } = parseDocumentLink(docUrl)
    if (type === 'workspace') {
      // we're going to have to deal with this specially...
      // props.setWorkspaceUrl(docUrl)
      return
    }

    if (!workspace) {
      log('Trying to navigate to a document before the workspace doc is loaded!')
      return
    }

    // Reset scroll position
    window.scrollTo(0, 0)

    changeWorkspace((ws: WorkspaceDoc) => {
      console.log("before", ws)
      ws.currentDocUrl = docUrl

      ws.viewedDocUrls = ws.viewedDocUrls.filter((url) => url !== docUrl)
      ws.viewedDocUrls.unshift(docUrl)

      if (ws.archivedDocUrls) {
        ws.archivedDocUrls = ws.archivedDocUrls.filter((url) => url !== docUrl)
      }
      console.log("after", ws)
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

  console.log('render')
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

  console.log('rendering content', workspace.currentDocUrl)

  const content = renderContent(workspace.currentDocUrl)

  return (
    <SelfContext.Provider value={workspace.selfId}>
      <div className="Workspace">
        <TitleBar documentId={documentId} openDoc={openDoc} onContent={onContent} />
        {content}
      </div>
    </SelfContext.Provider>
  )
}

const WELCOME_TEXT = `Welcome to PushPin!

    We've created your first text card for you.
    You can edit it, or make more by double-clicking the background.

    You can drag or paste images, text, PDFs, audio, video, and URLs onto the board. They'll be stored for offline usage.

    Right-clicking on the board opens a menu that allows you to insert any kind of card. You can also make new boards from the right-click menu or with Ctrl-N.

    There's a Chrome plugin that can capture webpages for you. You can find it at github.com/pvh/pushpin-clipper.

    You can edit a card's title (visible in the titlebar when the card is selected) by clicking on it and typing.

    Quick travel around your workspace by clicking the magnifying glass icon in the title bar– this opens the omnibox. Typing part of a name will show you corresponding people and boards. The omnibox can also be opened with '/'.

    To share a board with another person, click the clipboard in the upper-right corner, then have them paste that value into the omnibox (will open your board in their workspace) or onto a board (will link your board to their current board).

    To create links to boards or contacts, drag them from the title bar or the omnibox or press the 'place on board' (Shift + Enter) next to the corresponding object in the omnibox.`

// PVH: Todo
export function create(_attrs: any, handle: DocHandle<any>) {
  ContentTypes.create('contact', {}, (selfContentUrl) => {
    const selfDocumentId = parseDocumentLink(selfContentUrl).documentId
    // this is, uh, a nasty hack.
    // we should refactor not to require the DocumentId on the contact
    // but i don't want to pull that in scope right now

    ContentTypes.create('thread', { title: "Ink & Switch" }, (threadUrl) => {
      handle.change((workspace) => {
        console.log('setting it up')
        workspace.selfId = selfDocumentId
        workspace.contactIds = []
        workspace.currentDocUrl = threadUrl
        workspace.viewedDocUrls = [threadUrl]
        console.log("done", workspace)
      })
    })
  })
}

ContentTypes.register({
  type: 'workspace',
  name: 'Workspace',
  icon: 'briefcase',
  contexts: {
    root: Workspace,
    list: WorkspaceInList,
    board: WorkspaceInList,
    'title-bar': WorkspaceInList,
  },
  resizable: false,
  unlisted: true,
  create,
})
