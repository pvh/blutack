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

// from: https://gist.github.com/72lions/4528834
function concatArrayBuffers (bufs) {
  var offset = 0;
  var bytes = 0;
  var bufs2=bufs.map(function(buf,total){
      bytes += buf.byteLength;
      return buf;
  });
  var buffer = new ArrayBuffer(bytes);
  var store = new Uint8Array(buffer);
  bufs2.forEach(function(buf){
      store.set(new Uint8Array(buf.buffer||buf,buf.byteOffset),offset);
      offset += buf.byteLength;
  });
  return buffer   
}

async function handleSetMessage(message) {
  console.log("Handling set message", message)
  const { binaryDataId, mimeType, binary } = message.data

  const reader = binary.getReader();
  const buffers = []
  while( true ) {
    const { done, value } = await reader.read();
    if( done ) { break; }
    buffers.push(value)
  }
  
  STORE[binaryDataId] = { mimeType, binary: concatArrayBuffers(buffers) }
  console.log("Finished set and stored", STORE[binaryDataId])
}

function handleGetMessage(message) {
  console.log("Getting data", message)
  const { binaryDataId, replyPort } = message.data
  console.log("starting get", STORE[binaryDataId])
  if (!STORE[binaryDataId]) {
    throw new Error("Tried to get missing data")
  }

  const { mimeType, binary } = STORE[binaryDataId]
  
  var out = new ArrayBuffer(binary.byteLength);
  new Uint8Array(out).set(new Uint8Array(binary));

  console.log("cloned and made", out)
  
  replyPort.postMessage({
    binaryDataId, mimeType, binary: out
  }, [out])
}

self.addEventListener("message", (event) => {
  console.log("MESSAGE", event, STORE)

  const message = event.data

  switch (message.type) {
    case "set":
      handleSetMessage(message)
      break
    case "get":
      setTimeout(() => handleGetMessage(message), 100)
      break
  }
})

self.addEventListener("install", () => {
  self.skipWaiting()
});
