const STORE = {}

self.addEventListener("fetch", async function (event) {
  const url = new URL(event.request.url)

  // TODO: this is not good
  const match = url.pathname.match(/^\/blutack\/src\/binary\/(.*)$/)

  if (match) {
    console.log("Match!")
    const [, data] = match
    const name = `web+binarydata://${data}`

    event.respondWith(
      (async () => {
        const [header, binary] = await loadBinaryData(name)
        console.log("entry", binary)

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

self.addEventListener("message", (e) => {
  console.log("received a hello from a renderer", e)
  messageTarget = e.source
})

let messageTarget
async function getMessageTarget() {
  if (messageTarget) {
    return messageTarget
  }
  return new Promise((resolve) => {})
}

async function loadBinaryData(binaryDataId) {
  return new Promise((resolve, reject) => {
    const { port1: myPort, port2: theirPort } = new MessageChannel()

    myPort.addEventListener("message", (e) => {
      console.log("heard back from the renderer", e)
      const { mimeType, binary } = e.data
      console.log(mimeType, binary)
      resolve([{ size: binary.byteLength, mimeType }, binary])
    })
    myPort.start()

    getMessageTarget().then((target) => {
      target.postMessage(
        {
          type: "get",
          data: { binaryDataId, replyPort: theirPort },
        },
        [theirPort]
      )
    })
  })
}

self.addEventListener("install", () => {
  self.skipWaiting()
})
