export {}


(async () => {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker
        .register("/service-worker.js", {
          scope: "/",
        });

      if (registration.installing) {
        console.log("sw: Service worker installing");
      } else if (registration.waiting) {
        console.log("sw: Service worker installed");
      } else if (registration.active) {
        console.log("sw: Service worker active");
      }
    } catch (error) {
      console.error(`sw: Registration failed with ${error}`);
    }
  }

})();


export async function storeBinary (key: string, value: any) {
  console.log('sw: store')

  await navigator.serviceWorker.ready

  console.log("sw: do set")

  navigator.serviceWorker.controller!.postMessage({
    type: "set", key, value,
  })
}
