const STORE = {};

self.addEventListener('fetch', function(event) {
  const url = new URL(event.request.url)
  
  // TODO: this is not good
  const match = url.pathname.match(/^\/blutack\/src\/binary\/(.*)$/)


  if (match) {
    const [, data] = match
    const name = `web+binarydata://${data}`

    const entry = STORE[name]

    console.log("entry", entry)

    if (!entry) {
      event.respondWith(
        new Response("Not found", {
          status: 404,
          headers: {'Content-Type': "text/plain"}
        })
      )

      return
    }

    event.respondWith(
      new Response(entry.binary, {
        headers: {'Content-Type': entry.mimeType}
      })
    )
  }
});

function handleSetMessage(message) {
  const { binaryDataId, mimeType, binary } = message.data
  STORE[binaryDataId] = { mimeType, binary }
}

function handleGetMessage(message) {
  const { binaryDataId, replyPort } = message.data
  if (!STORE[binaryDataId]) {
    throw new Error("Tried to get missing data")
  }

  const { mimeType, binary } = STORE[binaryDataId]

  replyPort.postMessage({
    binaryDataId, mimeType
  })
}

self.addEventListener("message", (event) => {
  console.log("MESSAGE", event, STORE)

  const message = event.data

  switch (message.type) {
    case "set":
      handleSetMessage(message)
      break
    case "get":
      handleGetMessage(message)
      break
  }
})

self.addEventListener("install", () => {
  self.skipWaiting()
});
