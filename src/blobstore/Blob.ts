import { DocumentId } from "automerge-repo"
import { useRepo } from "automerge-repo-react-hooks"
import { useEffect, useState } from "react"
import { v4 } from "uuid"
import { __getRepo } from "../components/pushpin-code/ContentTypes"

export type BinaryDataId = string & { __binaryDataId: true }

export interface BinaryDataHeader {
  size: number
  mimeType: string
}

export interface BinaryObjectDoc {
  mimeType?: string
  binary: ArrayBuffer
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
    scheme: protocol ? protocol.substr(0, protocol.length - 1) : "",
    id: (pathname || "//").substr(2),
  }
}

export function isBinaryDataId(str: string): str is BinaryDataId {
  return str.startsWith("web+binarydata://")
}

export function parseBinaryDataId(binaryDataId: BinaryDataId) {
  return parts(binaryDataId)
}

export function createBinaryDataUrl(binaryDataId: BinaryDataId): string {
  const { id } = parts(binaryDataId)
  return `/blutack/src/binary/${id}`
}

export async function storeBinaryData(
  binary: ReadableStream,
  mimeType?: string
): Promise<BinaryDataId> {
  console.log("storing binary data")
  const binaryDataId = await storeData(binary, mimeType)
  console.log("stored it")
  return binaryDataId
}

// TODO: implement correct responses...
export function useBinaryDataHeader(
  binaryDataId?: BinaryDataId
): BinaryDataHeader | undefined {
  const [header, setHeader] = useState<BinaryDataHeader | undefined>()
  useEffect(() => {
    binaryDataId &&
      loadBinaryData(binaryDataId).then(([header]) => setHeader(header))
  }, [binaryDataId])
  return header
}

/* TODO: could request this from the shared-worker? would that be more efficient? */
export function useBinaryDataContents(
  binaryDataId?: BinaryDataId
): ArrayBuffer | undefined {
  const [buffer, setBuffer] = useState<ArrayBuffer | undefined>()
  useEffect(() => {
    binaryDataId &&
      loadBinaryData(binaryDataId).then(([, buffer]) => setBuffer(buffer))
  }, [binaryDataId])
  return buffer
}

async function loadBinaryData(
  binaryDataId: BinaryDataId
): Promise<[BinaryDataHeader, ArrayBuffer]> {
  return new Promise(async (resolve, reject) => {
    const { id: documentId } = parseBinaryDataId(binaryDataId)
    const handle = __getRepo().find<BinaryObjectDoc>(
      documentId as unknown as DocumentId
    )

    const doc = await handle.value()
    if (!doc.binary) throw new Error("Got a document with no binary...")

    const { mimeType = "wtf/whereisit", binary } = doc
    console.log("found", doc)
    resolve([{ mimeType, size: binary.byteLength }, binary])
  })
}

/* TODO: send this to the shared-worker */
async function storeData(binary: ReadableStream<Buffer>, mimeType?: string) {
  const reader = binary.getReader()
  const buffers: Buffer[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    buffers.push(value)
  }

  const handle = __getRepo().create<BinaryObjectDoc>()
  handle.change((d) => {
    d.binary = new Uint8Array(concatArrayBuffers(buffers))
    d.mimeType = mimeType
    console.log("done setting", mimeType, binary)
  })

  return ("web+binarydata://" + handle.documentId) as unknown as BinaryDataId
}

// from: https://gist.github.com/72lions/4528834
function concatArrayBuffers(bufs: Buffer[]): ArrayBuffer {
  var offset = 0
  var bytes = 0
  var bufs2 = bufs.map(function (buf, total) {
    bytes += buf.byteLength
    return buf
  })
  var buffer = new ArrayBuffer(bytes)
  var store = new Uint8Array(buffer)
  bufs2.forEach(function (buf) {
    store.set(new Uint8Array(buf.buffer || buf, buf.byteOffset), offset)
    offset += buf.byteLength
  })
  return buffer
}
