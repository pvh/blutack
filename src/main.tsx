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
import { parseDocumentLink } from "./lib/blutack/Url"

// hack: create globals so they are accessible in widgets

;(window as any).React = React
;(window as any).Blutack = Blutack
;(window as any).Ui = Ui

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

  return new Promise((resolve) => {
    ContentTypes.create("device", {}, async (deviceDocUrl, deviceDocHandle) => {
      await localforage.setItem("deviceDocId", deviceDocHandle.documentId)
      resolve(deviceDocHandle.documentId)
    })
  })
}

const BASE_CONTENT_TYPE_IDS = [
  "fe1c6cd6-8432-4ac7-8302-f6b16197f5c7", // content list
  "197067ec-0aa2-4d67-80f6-6959d561385b", // text
  "442ca202-f038-41d2-a61e-a6f586d62abd", // raw
  "2a12d381-a1ce-4e88-a158-bd2719cadd01", // profile
  "674bcfba-cc2c-404b-a2dc-ec8bc4baf182", // contact
  "11a46795-a9b4-48d1-bc4f-4da504fff93f", // device
  "a1652eae-8f52-4bfe-908d-76e48910cd34", // widget
  "043862bd-12e1-4b22-87d2-fc9fc7fe4ed1", // editor
]

async function findOrMakeProfileDoc(): Promise<DocumentId> {
  // profiles used to be called workspaces, for backwards compatibility keep the old name here
  const profileDocId = await localforage.getItem("profileDocId")

  if (profileDocId) {
    return profileDocId as DocumentId
  }

  // load base content types
  await Promise.all(
    BASE_CONTENT_TYPE_IDS.map((contentTypeId) => Modules.load(contentTypeId as DocumentId))
  )

  const handle = repo.create()
  const newProfileDocId = handle.documentId

  await localforage.setItem("profileDocId", newProfileDocId)

  return new Promise((resolve) => {
    ContentTypes.create(
      "profile",
      { baseContentTypeIds: BASE_CONTENT_TYPE_IDS },
      async (profileDocUrl, profileDocHandle) => {
        await localforage.setItem("profileDocId", profileDocHandle.documentId)
        resolve(profileDocHandle.documentId)
      }
    )
  })
}

// bootstrapping: first try the indexedDB, then make one
const profileDocId = await findOrMakeProfileDoc()

const profile = await repo.find<any>(profileDocId).value()
const contentTypesList = await repo.find<any>(profile.contentTypesListId).value()

// load known content types
await Promise.all(
  contentTypesList.content.map(async (contentTypeUrl: string) => {
    const { documentId, type } = parseDocumentLink(contentTypeUrl)

    if (type !== "widget") {
      return
    }

    await Modules.load(documentId as DocumentId)
  })
)

// bootstrap device only after all base types are loaded through bootstrapping the profile
const deviceDocId = await findOrMakeDeviceDoc()

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RepoContext.Provider value={repo}>
      <Root profileDocId={profileDocId} deviceDocId={deviceDocId} />
    </RepoContext.Provider>
  </React.StrictMode>
)
