import { useRepo } from "automerge-repo-react-hooks";
import { useEffect, useState } from "react";
import { v4 } from "uuid"

export type BinaryDataId = string & { __binaryDataId: true };

export interface BinaryDataHeader {
  size: number;
  mimeType: string;
}

// web+pushpin://type/docId
// web+binarydata://docId

interface Parts {
  scheme: string
  id: string
}

function parts(id: BinaryDataId): Parts {
  const url = new URL(id)
  const protocol = url.protocol
  const pathname = url.pathname
  console.log(url, pathname)
  return {
    scheme: protocol ? protocol.substr(0, protocol.length - 1) : '',
    id: (pathname || '/').substr(1),
  }
}

export function isBinaryDataId(str: string): str is BinaryDataId {
  return str.startsWith('web+binarydata://')
}

export function parseBinaryDataId(binaryDataId: BinaryDataId) {
  return parts(binaryDataId)
}

export function createBinaryDataUrl(binaryDataId: BinaryDataId): string {
  const { id } = parts(binaryDataId)
  return `/src/binary/${id}`
}

export async function storeBinaryData(binary: Uint8Array, mimeType?: string): Promise<BinaryDataId> {
  await navigator.serviceWorker.ready

  const name = `web+binarydata://${v4()}` as BinaryDataId
  
  navigator.serviceWorker.controller!.postMessage({
    type: "set",
    data: { name, mimeType, binary }
    // this extra array sends the binary via the TransferList
    // see docs for Worker.postMessage
  }, [binary])

  return name
}

// TODO: implement correct responses...
export function useBinaryDataHeader(binaryDataId?: BinaryDataId): BinaryDataHeader | undefined {
  if (!binaryDataId) { return }
  return { size: 666, mimeType: "application/octet-stream" }
}

/* TODO: useful for when you need file metadata in your renderer / frontend

export function useHyperfile(url: HyperfileUrl | null): [Header, Readable] | [null, null] {
  const [header, setHeader] = useState<[Header, Readable] | [null, null]>([null, null])

  useEffect(() => {
    header && setHeader([null, null])
    url && Hyperfile.fetch(url).then(([header, readable]) => setHeader([header, readable]))
  }, [url])

  return header
}

export function useHyperfileHeader(url: HyperfileUrl | null): Header | null {
  const [header, setHeader] = useState<Header | null>(null)
  const { files } = useRepo()

  useEffect(() => {
    header && setHeader(null)
    url && files.header(url).then(setHeader)
  }, [url])

  return header
}
*/

export async function registerServiceWorker() {
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
}
