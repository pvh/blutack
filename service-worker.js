const STORE = {};


self.addEventListener('fetch', function(event) {
  const url = new URL(event.request.url)
  const match = url.pathname.match(/^\/src\/binary\/(.*)$/)


  if (match) {
    const [,blobName] = match

    const value = STORE[blobName]

    console.log('sw: my store', 'store', STORE)

    if (value) {
      event.respondWith(
        new Response(value, {
          headers: {'Content-Type': 'text/plain'}
        })
      )
    }
  }
});


self.addEventListener("message", ({data}) => {

  switch (data.type) {
    case "set":
      STORE[data.key] = data.value
      break
  }
})

self.addEventListener("install", (event) => {
  console.log('sw: install')

  self.skipWaiting()
});
