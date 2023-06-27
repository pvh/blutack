import { DocumentId } from "@automerge/automerge-repo"
import { BinaryDataId, createBinaryDataUrl } from "./Blob"
import * as ContentTypes from "../blutack-content/ContentTypes"
import { transform } from "@babel/standalone"

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

const importTransformPlugin = {
  name: "transform-imports-to-skypack",
  visitor: {
    ImportDeclaration(path: any) {
      const value = path.node.source.value

      // Don't replace relative or absolute URLs.
      if (/^([./])/.test(value)) {
        return
      }

      path.node.source.value = `https://cdn.skypack.dev/${value}`
    },
  },
}

export function transformSource(source: string) {
  return transform(source, {
    presets: ["react"],
    plugins: [importTransformPlugin],
    parserOpts: { allowReturnOutsideFunction: true },
  })
}
