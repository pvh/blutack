import { DocumentId } from "automerge-repo"
import { ViewState } from "./ViewState"

export type PushpinUrl = string & { pushpin: true }

export function isPushpinUrl(str?: string | null): str is PushpinUrl {
  if (!str) {
    return false
  }
  const { scheme, type, documentId } = parts(str)
  return (
    scheme === "web+pushpin" && type !== undefined && documentId !== undefined
  )
}

export function createDocumentLink(
  type: string,
  docId: DocumentId
): PushpinUrl {
  if (!type) {
    throw new Error("no type when creating URL")
  }
  return `web+pushpin://${type}/${docId}` as PushpinUrl
}

export function createWebLink(
  windowLocation: Location,
  pushPinUrl: PushpinUrl,
  viewState?: ViewState
) {
  var url = windowLocation.href.split("?")[0]
  const urlWithDocument = `${url}?document=${encodeURIComponent(pushPinUrl)}`

  if (!viewState) {
    return urlWithDocument
  }

  const encodedViewState = encodeURIComponent(JSON.stringify(viewState))
  return `${urlWithDocument}&viewState=${encodedViewState}`
}

// const url = "?document=web%2Bpushpin%3A%2F%2Fcontentlist%2Ffcfb63f5-777e-469b-a9bd-9f093d1ba2b7"
// const url = "web+pushpin://contentlist/fcfb63f5-777e-469b-a9bd-9f093d1ba2b7"
// isPushpinUrl(url) === true

interface Parts {
  scheme: string
  type: string
  documentId: DocumentId
}

export function parseDocumentLink(link: string): Parts {
  if (!link) {
    throw new Error("Cannot parse an empty value as a link.")
  }

  const { scheme, type, documentId } = parts(link)

  if (scheme !== "web+pushpin") {
    throw new Error(`Missing the pushpin scheme in ${link}`)
  }

  if (!type) {
    throw new Error(`Missing type in ${link}`)
  }

  if (!documentId === undefined) {
    throw new Error(`Missing docId in ${link}`)
  }

  return { scheme, type, documentId: documentId as DocumentId }
}

export function parts(str: string) {
  const matches = str.match(
    /(.+):\/\/(?:www\.)?([-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b)*(\/[\/\d\w\.-]*)*(?:[\?])*(.+)*/
  )
  if (!matches) return { scheme: "", type: "", documentId: "" }
  const [, protocol, , , path] = matches

  const scheme = protocol
  const [type, documentId] = path.split("/")

  return { scheme, type, documentId }
}
