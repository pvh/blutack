import Debug from "debug"
import { ComponentType } from "react"
import { createDocumentLink, PushpinUrl } from "./Url"
import { ContentData } from "./ContentData"
import { DocumentId } from "automerge-repo"
import { DocCollection, DocHandle } from "automerge-repo"
import { Doc } from "@automerge/automerge"

const log = Debug("pushpin:content-types")

// type Component = ComponentType<ContentProps>
// TODO: This should be ComponentType<ContentProps>, but it breaks with
// Content's "pass-through" props when React casts them with Readonly<P>.
// The fix is likely to put "pass-through" props inside a single 'options: any' prop
// that allows for pass-through.
type Component = ComponentType<any>

export type Context = "root" | "expanded" | "title" | "badge" | "board"

type Contexts = {
  [K in Context]?: Component
}

export interface ContentType {
  type: string
  name: string
  icon: string
  unlisted?: boolean
  dontAddToViewedDocUrls?: boolean
  resizable?: boolean
  contexts: Contexts
  create?: (typeAttrs: any, handle: DocHandle<unknown>) => Promise<void> | void
  createFrom?: (contentData: ContentData, handle: DocHandle<any>) => Promise<void> | void
  supportsMimeType?: (type: string) => boolean
  // TODO: i don't love this, but we'll put it here for now
}

const registry: { [type: string]: ContentType } = {}
const defaultRegistry: {
  [K in Context]?: Component
} = {}

// This is a hack to have a reference to the repo without relying on window.repo.
let repo: DocCollection
export function __getRepo() {
  if (!repo) throw new Error("Repo has not been set. Must call __setRepo().")
  return repo
}
export function setRepo(repoIn: DocCollection) {
  repo = repoIn
}

export function register(contentType: ContentType) {
  const { type } = contentType
  const entry: ContentType = {
    unlisted: false,
    resizable: true,
    ...contentType,
  }

  log("register", entry)

  if (registry[type]) {
    // Allow re-registration to support HMR
    log(`Replacing '${type}' content type.`)
  }

  registry[type] = entry
}

export function registerDefault(contentType: { component: Component; context: Context }) {
  const { component, context } = contentType
  defaultRegistry[context] = component
}

export interface LookupQuery {
  type: string
  context: Context
}

export interface LookupResult {
  type: string
  name: string
  icon: string
  unlisted: boolean
  resizable: boolean
  component: Component
}

// TODO: this could be simplified to not include a context
export function lookup({ type, context }: LookupQuery): LookupResult | null {
  const entry = registry[type]
  const component = (entry && entry.contexts[context]) || defaultRegistry[context]

  if (!component) {
    return null
  }

  const { name = "Unknown", icon = "question", unlisted = false, resizable = true } = entry || {}

  return { type, name, icon, component, unlisted, resizable }
}

export function typeNameToContentType(type: string): ContentType | undefined {
  return registry[type]
}

export function mimeTypeToContentType(mimeType?: string): ContentType {
  if (!mimeType) {
    return registry.file
  } // don't guess.

  const types = Object.values(registry)
  const supportingType = types.find(
    (type) => type.supportsMimeType && type.supportsMimeType(mimeType)
  )
  if (!supportingType) {
    return registry.file
  }

  return supportingType
}

export type CreateCallback = (url: PushpinUrl, handle: DocHandle<unknown>) => void

export function createFrom(contentData: ContentData, callback: CreateCallback): void {
  // importFromText
  // TODO: the different content types should include mime type tests.
  let contentType: string
  if (contentData.mimeType === "text/html") {
    contentType = "url"
  } else if (contentData.mimeType.includes("text/")) {
    contentType = "text"
  } else {
    contentType = "file"
  }
  const entry = registry[contentType]
  if (!entry) return
  if (!entry.createFrom) throw new Error("Cannot be created from file")
  const handle = __getRepo().create() as DocHandle<unknown>
  Promise.resolve(entry.createFrom(contentData, handle))
    .then(() => {
      callback(
        createDocumentLink(contentType, handle.documentId as DocumentId),
        handle // TODO: unclear if this is a good idea but YOLOing a bit for demo
      )
    })
    .catch(log)
}

export function create(type: string, attrs = {}, callback: CreateCallback): void {
  const entry = registry[type]
  if (!entry) {
    console.error(`Cannot create unknown type ${type}`)
    return
  }

  // ugh
  const handle = __getRepo().create() as DocHandle<unknown>

  if (!entry.create) {
    throw Error(`The ${type} content type cannot be created directly.`)
  }
  Promise.resolve(entry.create(attrs, handle))
    .then(() => {
      callback(
        createDocumentLink(type, handle.documentId as DocumentId),
        handle // unclear if this is a good idea but YOLOing a bit for demo
      )
    })
    .catch(log)
}

export interface ListQuery {
  context: Context
  withUnlisted?: boolean
}

export function list({ context, withUnlisted = false }: ListQuery): LookupResult[] {
  const allTypes = Object.keys(registry)
    .map((type) => lookup({ type, context }))
    .filter((ct) => ct) as LookupResult[]

  if (withUnlisted) {
    return allTypes
  }

  return allTypes.filter((ct) => ct && !ct.unlisted)
}

// Not yet included in / drive from the generic ContentTypes registry:
//
// * NPM packages
// * CSS includes
// * import statements
// * add function on board
