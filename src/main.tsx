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
import * as Blutack from "./lib/blutack"
import * as Ui from "./lib/ui"

// TODO: load dynamically
import { create as createProfile } from "./bootstrap/Profile.jsx"
import { create as createDevice } from "./bootstrap/Device.jsx"
import { parseDocumentLink } from "./lib/blutack/Url";

// hack: create globals so they are accessible in widgets
(window as any).React = React;
(window as any).Blutack = Blutack;
(window as any).Ui = Ui;

const { ContentTypes, Modules } = Blutack

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
  const profileDocId = await localforage.getItem("profileDocId")

  if (profileDocId) {
    return profileDocId as DocumentId
  }

  const handle = repo.create()
  const newProfileDocId = handle.documentId

  await localforage.setItem("profileDocId", newProfileDocId)

  createProfile({}, handle)

  return newProfileDocId
}

// bootstrapping: first try the indexedDB, then make one
const deviceDocId = await findOrMakeDeviceDoc()
const profileDocId = await findOrMakeProfileDoc()

console.log("deviceDocId", deviceDocId)
console.log("profileDocId", profileDocId)

const profile = await (repo.find<any>(profileDocId).value())
const contentTypesList = await (repo.find<any>(profile.contentTypesListId).value())

// load known content types
await Promise.all(contentTypesList.content.map(async (contentTypeUrl : string) => {
  const {documentId, type} = parseDocumentLink(contentTypeUrl)

  if (type !== "widget") {
    return
  }

  const module = await Modules.load(documentId as DocumentId)
  console.log("load custom type", module.contentType.type)
}))

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RepoContext.Provider value={repo}>
      <Root profileDocId={profileDocId} deviceDocId={deviceDocId} />
    </RepoContext.Provider>
  </React.StrictMode>
)
