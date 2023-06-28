// PVH note: This should go into the widget code not generic Blutack stuff.

import { DocumentId } from "@automerge/automerge-repo"
import { BinaryDataId, createBinaryDataUrl } from "./binary/Blob.js"
import * as ContentTypes from "../blutack/content/ContentTypes.js"
import { transform } from "@babel/standalone"

export async function load(documentId: DocumentId) {
  const module = await import(
    // disable vite warning that it cannot statically analyze this import statement
    createBinaryDataUrl(
      /* @vite-ignore */
      `web+binarydata://${documentId}?rand=${Math.random()}` as unknown as BinaryDataId
    )
  )

  if (module.contentType) {
    ContentTypes.register(module.contentType)
  }

  return module
}

export interface Dependency {
  url: string
  sourceDocId: DocumentId
}

export interface DependencyMap {
  [name: string]: Dependency
}

function getImportTransformPlugin(dependencies?: DependencyMap) {
  return {
    name: "transform-imports",
    visitor: {
      ImportDeclaration(path: any) {
        const name = path.node.source.value

        // Don't replace relative or absolute URLs.
        if (/^([./])/.test(name)) {
          return
        }

        path.node.source.value =
          dependencies && dependencies[name]
            ? createBinaryDataUrl(
                `web+binarydata://${dependencies[name].sourceDocId}` as unknown as BinaryDataId
              )
            : `https://cdn.skypack.dev/${name}` // todo: remove fallback once all widgets are converted
      },
    },
  }
}

export function transformSource(source: string, dependencies?: DependencyMap) {
  return transform(source, {
    presets: ["react"],
    plugins: [getImportTransformPlugin(dependencies)],
    parserOpts: { allowReturnOutsideFunction: true },
  })
}
