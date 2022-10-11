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
export function useBinaryDataHeader(binaryDataId?: BinaryDataId): BinaryDataHeader | undefined {
  const [header, setHeader] = useState<BinaryDataHeader | undefined>()
  useEffect(() => {
    binaryDataId && loadBinaryData(binaryDataId).then(([header, ]) => setHeader(header))
  }, [binaryDataId])
  return header
}

export function useBinaryDataContents(binaryDataId?: BinaryDataId): ReadableStream | undefined {
  const [stream, setStream] = useState<ReadableStream | undefined>()
  useEffect(() => {
    binaryDataId && loadBinaryData(binaryDataId).then(([, readable]) => setStream(readable))
  }, [binaryDataId])
  return stream
}

async function loadBinaryData(binaryDataId: BinaryDataId): Promise<[BinaryDataHeader, ReadableStream]> {
  return new Promise((resolve, reject) => {
    const { port1: myPort, port2: theirPort } = new MessageChannel()

    myPort.addEventListener("message", e => {
      console.log("heard back from the service worker", e)
      const { mimeType, binary } = e.data
      console.log( mimeType, binary )
      resolve([{ size: 666 /* TODO */, mimeType }, binary])
    })
    myPort.start()

    navigator.serviceWorker.controller!.postMessage({
      type: "get",
      data: { binaryDataId, replyPort: theirPort }
    }, [theirPort])
  })
}

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
