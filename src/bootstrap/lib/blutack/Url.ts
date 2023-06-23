import { ViewState } from "./ViewState"
import { useEffect, useState } from "react"
import { DocumentId } from "../../../../../automerge-repo"

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

export function openDocument(url: PushpinUrl) {
  const {documentId, type} = parseDocumentLink(url)
  changeUrl(`//${window.location.host}/blutack/${documentId}/${type}`)
}

export function openEmptyState () {
  changeUrl(`//${window.location.host}/blutack/`)
}


// always use changeUrl instead of using the history api directly
// because otherwise we won't be notified of the changes
export function changeUrl(url: string) {
  history.pushState({}, "", url)
  window.dispatchEvent(new Event("popstate"))
}

export function openDoc(url: PushpinUrl, viewState?: ViewState) {
  changeUrl(createWebLink(window.location, url, viewState))
}

export function setViewStateValue(
  documentId: DocumentId,
  key: string,
  value: any
) {
  const url = new URL(window.location.href)
  const viewState = getUrlParams().viewState

  url.searchParams.set(
    "viewState",
    encodeURIComponent(
      JSON.stringify({
        ...viewState,
        [documentId]: { ...viewState[documentId], [key]: value },
      })
    )
  )

  changeUrl(url.toString())
}

interface UrlParams {
  currentDocUrl?: PushpinUrl
  viewState: ViewState
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
  const viewState = rawViewState ? parseViewState(rawViewState) : {}
  const currentDocUrl = params.get("document")

  return {
    viewState,
    currentDocUrl: isPushpinUrl(currentDocUrl) ? currentDocUrl : undefined,
  }
}

function parseViewState(raw: string): ViewState {
  try {
    return JSON.parse(decodeURIComponent(raw))
  } catch (e) {
    return {}
  }
}

export function getCurrentDocUrl(): PushpinUrl | undefined {
  return getUrlParams().currentDocUrl
}

export function getUrl() {
  return `${location.pathname}${location.search}`
}

export function getCurrentDocId(): DocumentId | undefined {
  const docUrl = getUrlParams().currentDocUrl
  return !docUrl ? undefined : parseDocumentLink(docUrl)?.documentId
}

export interface DocWithUrlState {
  __urlByUserId: { [userId: DocumentId]: string }
}

export function storeCurrentUrlOfUser(
  document: DocWithUrlState,
  userId: DocumentId
) {
  let urlByUser = document.__urlByUserId

  if (!urlByUser) {
    document.__urlByUserId = {}
    urlByUser = document.__urlByUserId
  }

  urlByUser[userId] = getUrl()
}

export function loadUrlOfUser(document: DocWithUrlState, userId: DocumentId) {
  const url = document.__urlByUserId?.[userId]

  if (url) {
    changeUrl(url)
  }
}

const DOC_URL_REGEX = /^\/blutack\/(([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\/(.+))?$/

interface ActiveRoute {
  documentId: DocumentId
  type: string
}

export function useActiveRoute () : ActiveRoute | undefined  {
  const [ activeRoute, setActiveRoute ] = useState<ActiveRoute | undefined>(undefined)

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

      setActiveRoute(documentId && type  ? { documentId, type } : undefined)
    }

    onChangeUrl()

    window.addEventListener("popstate", onChangeUrl)

    return () => {
      window.removeEventListener("popstate", onChangeUrl)
    }
  }, [])

  return activeRoute
}