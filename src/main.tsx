import React from "react"
import ReactDOM from "react-dom/client"
import Root from "./components/Root"
import "./app.css"
import "./ibm-plex.css"
import "./vendor/line-awesome/css/line-awesome.min.css"

import localforage from "localforage"

import { DocumentId, Repo } from "automerge-repo"
import { LocalForageStorageAdapter } from "automerge-repo-storage-localforage"
import { BroadcastChannelNetworkAdapter } from "automerge-repo-network-broadcastchannel"
import { RepoContext } from "automerge-repo-react-hooks"
import * as ContentTypes from "./components/pushpin-code/ContentTypes"
import { create as createWorkspace } from "./components/content-types/workspace/Workspace"
import { BrowserWebSocketClientAdapter } from "automerge-repo-network-websocket"

async function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register(
        "/service-worker.js",
        {
          scope: "/",
        }
      )
    } catch (error) {
      console.error(`sw: Registration failed with ${error}`)
    }
  }
}
registerServiceWorker()

const sharedWorker = new SharedWorker(
  new URL("./shared-worker.js", import.meta.url),
  { type: "module", name: "automerge-repo-shared-worker" }
)

async function introduceWorkers(sharedWorker: SharedWorker) {
  const reg = await navigator.serviceWorker.ready
  if (!reg.active) {
    throw new Error(" where's the worker? ")
  }

  /* introduce the SharedWorker and the ServiceWorker. */
  console.log("service worker is ready")
  const channel = new MessageChannel()

  reg.active.postMessage({ sharedWorkerPort: channel.port1 }, [channel.port1])
  sharedWorker.port.start()
  sharedWorker.port.postMessage({ serviceWorkerPort: channel.port2 }, [
    channel.port2,
  ])
  console.log("posted to both workers")
}
introduceWorkers(sharedWorker)

const repo = await Repo({
  storage: new LocalForageStorageAdapter(),
  network: [new BroadcastChannelNetworkAdapter()],
  sharePolicy: (peerId) => peerId.includes("shared-worker"),
})

ContentTypes.setRepo(repo)

const findOrMakeDoc = async (key: string): Promise<DocumentId> => {
  let docId = new URLSearchParams(window.location.search).get(key)

  if (!docId) {
    docId = await localforage.getItem(key)
  }
  if (!docId) {
    const workspaceHandle = repo.create()
    docId = workspaceHandle.documentId
    if (key == "workspaceDocId") {
      createWorkspace({}, workspaceHandle)
    }
    await localforage.setItem(key, docId)
  }
  return docId as DocumentId
}

// bootstrapping: first try the window location, then check indexedDB, then make one
const workspaceDocId = await findOrMakeDoc("workspaceDocId")
const deviceDocId = await findOrMakeDoc("deviceDocId")

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RepoContext.Provider value={repo}>
      <Root workspaceDocId={workspaceDocId} deviceDocId={deviceDocId} />
    </RepoContext.Provider>
  </React.StrictMode>
)
