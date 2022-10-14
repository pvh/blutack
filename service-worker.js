const CACHED_BINARY_OBJECTS = {}

self.addEventListener("fetch", async function (event) {
  const url = new URL(event.request.url)

  const binaryDataId = url.searchParams.get("binaryDataId")
  if (url.pathname === "/blutack/" && binaryDataId) {
    console.log("found a binary data URL")
    event.respondWith(
      (async () => {
        let entry = CACHED_BINARY_OBJECTS[binaryDataId]
        if (!entry) {
          console.log(`[${binaryDataId}]: requesting from shared-worker`)
          entry = await loadBinaryData(binaryDataId)
          console.log(`[${binaryDataId}]: received from shared-worker`, entry)
          CACHED_BINARY_OBJECTS[binaryDataId] = entry
        }
        // TODO: handle case where it's not in either
        const [header, binary] = entry || [null, null]

        console.log(`[${binaryDataId}]: answering`, entry)

        if (!header) {
          return new Response("Not found", {
            status: 404,
            headers: { "Content-Type": "text/plain" },
          })
        }

        return new Response(binary, {
          headers: { "Content-Type": header.mimeType },
        })
      })()
    )
  }
})

const openRequests = {}

let binaryDataRequestPort
self.addEventListener("message", (e) => {
  console.log("ServiceWorker recieved a message", e)
  binaryDataRequestPort = e.data.sharedWorkerPort
  binaryDataRequestPort.onmessage = (e) => {
    console.log("binaryDataRequestPort inbound message: ", e)
    const { binaryDataId, mimeType, binary } = e.data
    const resolve = openRequests[binaryDataId]
    if (!resolve) {
      throw new Error("got a response with no request")
    }
    resolve([mimeType, binary])
  }
})

async function loadBinaryData(binaryDataId) {
  if (!binaryDataRequestPort) {
    throw new Error("gotta wait for that port")
  }
  console.log("loadBinaryData", binaryDataId)
  const promise = new Promise((resolve, reject) => {
    binaryDataRequestPort.postMessage({ binaryDataId })
    console.log("loadBinaryData posted", binaryDataId)
    openRequests[binaryDataId] = resolve
    // what about reject?
  })
  return promise
}

self.addEventListener("install", function (event) {
  console.log("installed")
  event.waitUntil(self.skipWaiting()) // Activate worker immediately
})

self.addEventListener("activate", function (event) {
  console.log("activated")
  event.waitUntil(self.clients.claim()) // Become available to all pages
})
