import React from "react"
import ReactDOM from "react-dom/client"
import Root from "./components/Root"
import "./App.css"
import "./ibm-plex.css"
import "./vendor/line-awesome/css/line-awesome.min.css"

import localforage from "localforage"

import { DocumentId, Repo } from "automerge-repo"
import { MessageChannelNetworkAdapter } from "automerge-repo-network-messagechannel"
import { RepoContext } from "automerge-repo-react-hooks"
import * as ContentTypes from "./components/pushpin-code/ContentTypes"
import { create as createWorkspace } from "./components/content-types/workspace/Workspace"
import { create as createDevice } from "./components/content-types/workspace/Device"
import { LocalForageStorageAdapter } from "automerge-repo-storage-localforage"

async function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register(
        "/blutack/service-worker.js", // TODO: path fix
        {
          scope: "/blutack/",
        }
      )
    } catch (error) {
      console.error(`sw: Registration failed with ${error}`)
    }
  }
}
registerServiceWorker()

let sharedWorker = await createSharedWorker()

// FIXME - had an issue with shared worker missing the connect message on the first startup
// if it was also loading wasm - unsure what the issue is but repeating the sharedworker
// in the only workaround we have at the moment
function createSharedWorker(): Promise<SharedWorker> {
  return new Promise((resolve) => {
    let interval = setInterval(() => {
      let worker = new SharedWorker(
        new URL("./shared-worker.ts", import.meta.url),
        { type: "module", name: "automerge-repo-shared-worker" }
      )
      worker.port.onmessage = (e) => {
        if (e.data === "READY") {
          clearInterval(interval)
          resolve(worker)
        }
      }
    }, 100)
  })
}

async function introduceWorkers(sharedWorker: SharedWorker) {
  const reg = await navigator.serviceWorker.ready
  if (!reg.active) {
    throw new Error(" where's the worker? ")
  }

  /* introduce the SharedWorker and the ServiceWorker. */
  console.log("service worker is ready")
  const channel = new MessageChannel()

  reg.active.postMessage({ sharedWorkerPort: channel.port1 }, [channel.port1])
  sharedWorker.port.postMessage({ serviceWorkerPort: channel.port2 }, [
    channel.port2,
  ])
  console.log("posted to both workers")
}
introduceWorkers(sharedWorker)

function setupSharedWorkerAndRepo() {
  const repoNetworkChannel = new MessageChannel()
  sharedWorker.port.postMessage({ repoNetworkPort: repoNetworkChannel.port2 }, [
    repoNetworkChannel.port2,
  ])

  const repo = new Repo({
    storage: new LocalForageStorageAdapter(),
    network: [new MessageChannelNetworkAdapter(repoNetworkChannel.port1)],
    sharePolicy: (peerId) => peerId.includes("shared-worker"),
  })

  ContentTypes.setRepo(repo)
  return repo
}

const repo = setupSharedWorkerAndRepo()

// TODO: Yikes on bikes, ought to redesign this
const findOrMakeDoc = async (key: string): Promise<DocumentId> => {
  let docId = new URLSearchParams(window.location.search).get(key)

  if (!docId) {
    docId = await localforage.getItem(key)
  }
  if (!docId) {
    const handle = repo.create()
    docId = handle.documentId
    if (key == "workspaceDocId") {
      createWorkspace({}, handle)
    }
    if (key == "deviceDocId") {
      createDevice({}, handle)
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
