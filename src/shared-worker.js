import { Repo } from "automerge-repo"
import { BroadcastChannelNetworkAdapter } from "automerge-repo-network-broadcastchannel"
import { LocalForageStorageAdapter } from "automerge-repo-storage-localforage"
import { BrowserWebSocketClientAdapter } from "automerge-repo-network-websocket"
import { parseBinaryDataId } from "./blobstore/Blob"

console.log("shared-worker starting up")

self.onconnect = function (e) {
  var mainPort = e.ports[0]
  mainPort.onmessage = function (e) {
    console.log("shared-worker received a message", e)
    const port = e.data.serviceWorkerPort
    port.onmessage = (e) => {
      const message = e.data
      const { binaryDataId } = message
      const { id } = parseBinaryDataId(binaryDataId)
      const handle = repo.find(id)
      handle.value().then((doc) => {
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
}

async function getRepo(url) {
  return await Repo({
    storage: new LocalForageStorageAdapter(),
    network: [
      new BroadcastChannelNetworkAdapter(),
      new BrowserWebSocketClientAdapter(url),
    ],
    peerId: "shared-worker-" + Math.round(Math.random() * 10000),
    sharePolicy: (peerId) => peerId.includes("storage-server"),
  })
}

// BYO sync-server instructions:
// $ cd automerge-repo/packages/automerge-repo-sync-server
// $ yarn
// $ mkdir .amrg
// $ yarn start
// change the URL below to "ws://localhost:3030"
let repo
;(async () => {
  const r = await getRepo("wss://automerge-repo-sync-server.fly.dev")
  console.log("made the repo!", r)
  repo = r
})()
