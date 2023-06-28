import { useEffect, useState } from "react"
import { DocumentId } from "@automerge/automerge-repo"

export type ContentUrl = string & { pushpin: true }

export function isContentUrl(str?: string | null): str is ContentUrl {
  if (!str) {
    return false
  }
  const { scheme, type, documentId } = parts(str)
  return scheme === "web+pushpin" && type !== undefined && documentId !== undefined
}

export function createDocumentLink(type: string, docId: DocumentId): ContentUrl {
  if (!type) {
    throw new Error("no type when creating URL")
  }
  return `web+pushpin://${type}/${docId}` as ContentUrl
}

export function createWebLink(windowLocation: Location, pushPinUrl: ContentUrl) {
  var url = windowLocation.href.split("?")[0]
  const urlWithDocument = `${url}?document=${encodeURIComponent(pushPinUrl)}`

  return urlWithDocument
}

// const url = "?document=web%2Bpushpin%3A%2F%2Fcontentlist%2Ffcfb63f5-777e-469b-a9bd-9f093d1ba2b7"
// const url = "web+pushpin://contentlist/fcfb63f5-777e-469b-a9bd-9f093d1ba2b7"
// isContentUrl(url) === true

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
    /([a-zA-Z\+\.\-]+):\/\/(?:www\.)?([-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b)*(\/[\/\d\w\.-]*)*(?:[\?])*(.+)*/
  )
  if (!matches) return { scheme: "", type: "", documentId: "" }
  const [, protocol, , , path] = matches

  const scheme = protocol

  if (path === undefined) {
    return { scheme: "", type: "", documentId: "" }
  }

  const [type, documentId] = path.split("/")

  return { scheme, type, documentId }
}

export function openDocument(url: ContentUrl) {
  const { documentId, type } = parseDocumentLink(url)
  changeUrl(`//${window.location.host}/blutack/${documentId}/${type}`)
}

export function openEmptyState() {
  changeUrl(`//${window.location.host}/blutack/`)
}

// always use changeUrl instead of using the history api directly
// because otherwise we won't be notified of the changes
export function changeUrl(url: string) {
  history.pushState({}, "", url)
  window.dispatchEvent(new Event("popstate"))
}

export function openDoc(url: ContentUrl) {
  changeUrl(createWebLink(window.location, url))
}

interface UrlParams {
  currentDocUrl?: ContentUrl
}

export function useUrlParams() {
  const [urlParams, setUrlParams] = useState(() => getUrlParams())

  useEffect(() => {
    const onChangeUrl = () => {
      setUrlParams(getUrlParams())
    }

    window.addEventListener("popstate", onChangeUrl)

    return () => {
      window.removeEventListener("popstate", onChangeUrl)
    }
  })

  return urlParams
}

function getUrlParams(): UrlParams {
  const params = new URLSearchParams(window.location.search)
  const rawViewState = params.get("viewState")
  const currentDocUrl = params.get("document")

  return {
    currentDocUrl: isContentUrl(currentDocUrl) ? currentDocUrl : undefined,
  }
}

export function getCurrentDocUrl(): ContentUrl | undefined {
  return getUrlParams().currentDocUrl
}

export function getUrl() {
  return `${location.pathname}${location.search}`
}

export function getCurrentDocId(): DocumentId | undefined {
  const docUrl = getUrlParams().currentDocUrl
  return !docUrl ? undefined : parseDocumentLink(docUrl)?.documentId
}

const DOC_URL_REGEX =
  /^\/blutack\/(([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\/(.+))?$/

interface ActiveRoute {
  documentId: DocumentId
  type: string
}

export function useActiveRoute(): ActiveRoute | undefined {
  const [activeRoute, setActiveRoute] = useState<ActiveRoute | undefined>(undefined)

  useEffect(() => {
    const onChangeUrl = () => {
      const match = location.pathname.match(DOC_URL_REGEX)

      if (!match) {
        openEmptyState()
        setActiveRoute(undefined)
        return
      }

      if (!match) {
        return
      }

      const documentId = match[2] as DocumentId
      const type = match[3]

      setActiveRoute(documentId && type ? { documentId, type } : undefined)
    }

    onChangeUrl()

    window.addEventListener("popstate", onChangeUrl)

    return () => {
      window.removeEventListener("popstate", onChangeUrl)
    }
  }, [])

  return activeRoute
}
