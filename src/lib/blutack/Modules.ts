import { DocumentId } from "automerge-repo"
import { BinaryDataId, createBinaryDataUrl } from "../../blobstore/Blob"
import * as ContentTypes from "./ContentTypes"

export async function load(documentId: DocumentId) {
  const module = await import(
    createBinaryDataUrl(
      `web+binarydata://${documentId}?rand=${Math.random()}` as unknown as BinaryDataId
    )
  )

  if (module.contentType) {
    ContentTypes.register(module.contentType)
  }

  return module
}
