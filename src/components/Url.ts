import {
  createWebLink,
  isPushpinUrl,
  parseDocumentLink,
  PushpinUrl,
} from "./pushpin-code/ShareLink"
import { ViewState } from "./pushpin-code/ViewState"
import { useEffect, useState } from "react"
import { DocumentId } from "../../../automerge-repo"

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
