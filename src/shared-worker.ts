/// <reference lib="webworker" />
declare const self: SharedWorkerGlobalScope

import { DocumentId, PeerId, Repo } from "automerge-repo"
import { MessageChannelNetworkAdapter } from "automerge-repo-network-messagechannel"
import { LocalForageStorageAdapter } from "automerge-repo-storage-localforage"
import { BrowserWebSocketClientAdapter } from "automerge-repo-network-websocket"
import {
  BinaryDataId,
  BinaryObjectDoc,
  parseBinaryDataId,
} from "./blobstore/Blob"

console.log("shared-worker starting up")
import debug from "debug"
debug.enable("DocSynchronizer")

export interface FrontendConnection {
  repoNetworkPort: MessagePort
}
export interface ServiceWorkerConnection {
  serviceWorkerPort: MessagePort
}
export interface ServerWorkerRequest {
  binaryDataId: BinaryDataId
}

export type SharedWorkerMessage = ServiceWorkerConnection | FrontendConnection

// TODO: this is just a debugging thing, take out the next few lines if you notice them here
import * as Automerge from "@automerge/automerge"
// @ts-ignore-next-line
self.Automerge = Automerge

// BYO sync-server instructions:
// $ cd automerge-repo/packages/automerge-repo-sync-server
// $ yarn
// $ mkdir .amrg
// $ yarn start
// uncomment this and comment out the one below:
// const url = "ws://localhost:3030" // local sync server
const url = "ws://67.207.88.83" // cloud sync server on DigitalOcean
const repo = new Repo({
  storage: new LocalForageStorageAdapter(),
  network: [new BrowserWebSocketClientAdapter(url)],
  peerId: ("shared-worker-" + Math.round(Math.random() * 10000)) as PeerId,
  sharePolicy: (peerId) => peerId.includes("storage-server"),
})

self.addEventListener("connect", (e: MessageEvent) => {
  console.log("client connected to shared-worker")
  var mainPort = e.ports[0]
  mainPort.postMessage("READY")
  mainPort.onmessage = function (e: MessageEvent<SharedWorkerMessage>) {
    const data = e.data
    if ("serviceWorkerPort" in data) {
      configureServiceWorkerPort(data.serviceWorkerPort)
    } else if ("repoNetworkPort" in data) {
      // be careful to not accidentally create a strong reference to repoNetworkPort
      // that will prevent dead ports from being garbage collected
      configureRepoNetworkPort(data.repoNetworkPort)
    }
  }
})

function configureServiceWorkerPort(port: MessagePort) {
  port.onmessage = (e) => {
    const message = e.data
    const { binaryDataId } = message
    const { id } = parseBinaryDataId(binaryDataId)
    console.log(`[${id}]: shared-worker request`)

    if (!repo) {
      throw new Error("REPO NOT SETUP YET")
    }

    const handle = repo.find<BinaryObjectDoc>(id as DocumentId)
    handle.value().then((doc) => {
      console.log(`[${id}]: shared-worker value`, doc)

      const { mimeType, binary } = doc
      var outboundBinary = new ArrayBuffer(binary.byteLength)
      new Uint8Array(outboundBinary).set(new Uint8Array(binary))
      port.postMessage({ binaryDataId, mimeType, binary: outboundBinary }, [
        outboundBinary,
      ])
    })
    // and what if it doesn't work?
  }
}

async function configureRepoNetworkPort(port: MessagePort) {
  // be careful to not accidentally create a strong reference to port
  // that will prevent dead ports from being garbage collected
  repo.networkSubsystem.addNetworkAdapter(
    new MessageChannelNetworkAdapter(port, { useWeakRef: true })
  )
}

// monitor active network adapters
/* setInterval(() => {
  console.log(
    "active network adapters",
    Object.values(repo.networkSubsystem.peerIdToAdapter).length
  )
}, 100)
*/

console.log("ran shared-worker to end")
