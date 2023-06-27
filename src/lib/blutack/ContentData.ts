import mime from "mime-types"
import * as WebStreamLogic from "./WebStreamLogic"
import { BinaryDataId, storeBinaryData } from "./Blob"

export type FileUrl = string & { __fileUrl: false }

export interface ContentData {
  mimeType: string
  data: ReadableStream<Uint8Array>
  src?: string
  name?: string
  extension?: string
  capturedAt?: string // Date().toISOString()
}

export function fromFile(file: File) {
  return {
    name: file.name,
    mimeType: mime.contentType(file.type) || "application/octet-stream",
    data: file.stream(),
  }
}

export function fromString(str: string, mimeType: string = "text/plain") {
  return {
    mimeType,
    data: WebStreamLogic.fromString(str),
  }
}

export async function storeContentData({ data, mimeType }: ContentData): Promise<BinaryDataId> {
  const url = await storeBinaryData(data, mimeType)
  return url
}
