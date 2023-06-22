import React from "react"
import ReactDOM from "react-dom/client"
import Root from "./components/Root"
import "./App.css"
import "./ibm-plex.css"
import "./vendor/line-awesome/css/line-awesome.min.css"

import localforage from "localforage"

import { DocumentId, Repo } from "automerge-repo"
import { MessageChannelNetworkAdapter } from "automerge-repo-network-messagechannel"
import { RepoContext, useDocument } from "automerge-repo-react-hooks"
import * as ContentTypes from "./components/pushpin-code/ContentTypes"
import {
  create as createWorkspace,
  WorkspaceDoc,
} from "./components/content-types/workspace/Workspace"
import { create as createDevice } from "./components/content-types/workspace/Device"
import { LocalForageStorageAdapter } from "automerge-repo-storage-localforage"
import Content from "./components/Content"
import { loadWidgetModule } from "./components/content-types/Widget"

// hack: create globals so they are accessible in widgets
;(window as any).React = React
;(window as any).Content = Content
;(window as any).useDocument = useDocument

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
      let worker = new SharedWorker(new URL("./shared-worker.ts", import.meta.url), {
        type: "module",
        name: "automerge-repo-shared-worker",
      })
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
  sharedWorker.port.postMessage({ serviceWorkerPort: channel.port2 }, [channel.port2])
  console.log("posted to both workers")
}
introduceWorkers(sharedWorker)

function setupSharedWorkerAndRepo() {
  const repoNetworkChannel = new MessageChannel()
  sharedWorker.port.postMessage({ repoNetworkPort: repoNetworkChannel.port2 }, [
    repoNetworkChannel.port2,
  ])

  const repo = new Repo({
    network: [new MessageChannelNetworkAdapter(repoNetworkChannel.port1)],
    sharePolicy: async (peerId) => peerId.includes("shared-worker"),
  })

  ContentTypes.setRepo(repo)
  return repo
}

const repo = setupSharedWorkerAndRepo()

async function findOrMakeDeviceDoc(): Promise<DocumentId> {
  const deviceDocId = await localforage.getItem("deviceDocId")

  if (deviceDocId) {
    return deviceDocId as DocumentId
  }

  const handle = repo.create()
  const newDeviceDocId = handle.documentId

  createDevice({}, handle)

  await localforage.setItem("deviceDocId", newDeviceDocId)

  return newDeviceDocId
}

async function findOrMakeProfileDoc(): Promise<DocumentId> {
  // profiles used to be called workspaces, for backwards compatibility keep the old name here
  const profileDocId = await localforage.getItem("workspaceDocId")

  if (profileDocId) {
    return profileDocId as DocumentId
  }

  const handle = repo.create()
  const newProfileDocId = handle.documentId

  await localforage.setItem("workspaceDocId", newProfileDocId)

  createWorkspace({}, handle)

  return newProfileDocId
}

// bootstrapping: first try the indexedDB, then make one
const deviceDocId = await findOrMakeDeviceDoc()
const workspaceDocId = await findOrMakeProfileDoc()

console.log("deviceDocId", deviceDocId)
console.log("workspaceDocId", workspaceDocId)

const workspace = await repo.find<WorkspaceDoc>(workspaceDocId).value()

// load known content types
await Promise.all(
  // todo: should contentTypeIds be initialized to [] on workspace creation?
  (workspace.contentTypeIds ?? []).map((contentTypeDocId) => loadWidgetModule(contentTypeDocId))
)

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RepoContext.Provider value={repo}>
      <Root workspaceDocId={workspaceDocId} deviceDocId={deviceDocId} />
    </RepoContext.Provider>
  </React.StrictMode>
)
