const STORE = {};

self.addEventListener('fetch', function(event) {
  const url = new URL(event.request.url)
  
  // TODO: this is not good
  const match = url.pathname.match(/^\/blutack\/src\/binary\/(.*)$/)


  if (match) {
    const [, data] = match
    const name = `web+binarydata://${data}`

    const entry = STORE[name]

    console.log("STORE", STORE, name)

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


self.addEventListener("message", (event) => {
  console.log("MESSAGE", event, STORE)

  const message = event.data

  switch (message.type) {
    case "set":
      const { name, mimeType, binary } = message.data

      STORE[name] = { mimeType, binary }
      break
  }
})

self.addEventListener("install", () => {
  self.skipWaiting()
});
