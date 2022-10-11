import { useRepo } from "automerge-repo-react-hooks";
import { useEffect, useState } from "react";
import { v4 } from "uuid"

export type BinaryDataId = string & { __binaryDataId: true };

export interface BinaryDataHeader {
  size: number;
  mimeType: string;
}

// web+binarydata://docId

interface Parts {
  scheme: string
  id: string
}

function parts(id: BinaryDataId): Parts {
  const url = new URL(id)
  const protocol = url.protocol
  const pathname = url.pathname
  return {
    scheme: protocol ? protocol.substr(0, protocol.length - 1) : '',
    id: (pathname || '//').substr(2),
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
  return `/blutack/src/binary/${id}`
}

export async function storeBinaryData(binary: ReadableStream, mimeType?: string): Promise<BinaryDataId> {
  await navigator.serviceWorker.ready

  const binaryDataId = `web+binarydata://${v4()}` as BinaryDataId
  
  navigator.serviceWorker.controller!.postMessage({
    type: "set",
    data: { binaryDataId, mimeType, binary }
    // this extra array sends the binary via the TransferList
    // see docs for Worker.postMessage
  }, [binary as any])

  return binaryDataId
}

// TODO: implement correct responses...
export async function useBinaryDataHeader(binaryDataId?: BinaryDataId): Promise<BinaryDataHeader | undefined> {
  if (!binaryDataId) { return }

/*
  const [header, setHeader] = useState<BinaryDataHeader | undefined>()

  navigator.serviceWorker.controller!.postMessage({
    type: "get",
    data: { binaryDataId }
  })
  // TODO: there's no way for it to reply yet so just make up something convenient...
*/
  return { size: 666, mimeType: "image/png" }
}

/*
export function useBinaryDataFile(binaryDataId?: BinaryDataId): [BinaryDataHeader, ReadableStream] | [null, null] {
  const [header, setHeader] = useState<[BinaryDataHeader, ReadableStream] | [null, null]>([null, null])

  useEffect(() => {
    header && setHeader([null, null])
    binaryDataId && loadBinaryData(binaryDataId).then(([header, readable]) => setHeader([header, readable]))
  }, [url])

  return header
}
*/

/*
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
