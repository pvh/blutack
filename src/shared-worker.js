import { Repo } from "automerge-repo"
import { MessageChannelNetworkAdapter } from "automerge-repo-network-messagechannel"
import { LocalForageStorageAdapter } from "automerge-repo-storage-localforage"
import { BrowserWebSocketClientAdapter } from "automerge-repo-network-websocket"
import { parseBinaryDataId } from "./blobstore/Blob"

console.log("shared-worker starting up")

self.addEventListener("connect", (e) => {
  console.log("shared worker connected")
  var mainPort = e.ports[0]
  mainPort.onmessage = function (e) {
    console.log("shared-worker received a message", e)
    const data = e.data
    if (data.serviceWorkerPort) {
      configureServiceWorkerPort(data.serviceWorkerPort)
    } else if (data.repoNetworkPort) {
      configureRepoNetworkPort(data.repoNetworkPort, data.repoWebsocketUrl)
    }
  }
})

function configureServiceWorkerPort(port) {
  port.onmessage = (e) => {
    const message = e.data
    const { binaryDataId } = message
    const { id } = parseBinaryDataId(binaryDataId)
    console.log(`[${id}]: shared-worker request`)

    if (!repo) {
      throw new Error("REPO NOT SETUP YET")
    }

    const handle = repo.find(id)
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

// BYO sync-server instructions:
// $ cd automerge-repo/packages/automerge-repo-sync-server
// $ yarn
// $ mkdir .amrg
// $ yarn start
// change the URL below to "ws://localhost:3030"
let repo

async function configureRepoNetworkPort(
  port,
  url = "wss://automerge-repo-sync-server.fly.dev"
) {
  console.log("setting up repo with ", url, port)
  repo = await Repo({
    storage: new LocalForageStorageAdapter(),
    network: [
      new MessageChannelNetworkAdapter(port),
      new BrowserWebSocketClientAdapter(url),
    ],
    peerId: "shared-worker-" + Math.round(Math.random() * 10000),
    sharePolicy: (peerId) => peerId.includes("storage-server"),
  })
}

console.log("ran shared-worker to end")
