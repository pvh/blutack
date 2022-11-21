import { useCallback } from "react"
import { DocumentId } from "../../../../automerge-repo"

export interface DocWithViewState {
  __userStates: { [userId: DocumentId]: { [key: string]: any } }
}

export function getViewState() {
  const raw = new URLSearchParams(window.location.search).get("viewState")

  if (!raw) {
    return {}
  }

  try {
    return JSON.parse(decodeURIComponent(raw))
  } catch (e) {
    return {}
  }
}

function setViewStateValue(documentId: DocumentId, key: string, value: any) {
  const viewState = getViewState()

  const url = new URL(window.location.href)

  url.searchParams.set(
    "viewState",
    encodeURIComponent(
      JSON.stringify({
        ...viewState,
        [documentId]: { ...viewState[documentId], [key]: value },
      })
    )
  )

  window.location.href = url.toString()
}

function getViewStateValue(documentId: DocumentId, key: string) {
  const viewState = getViewState()

  return viewState?.[documentId]?.[key]
}

// equivalent to useState but stores state per user in the document
export function useViewState<T>(
  documentId: DocumentId | undefined,
  key: string,
  initialValue?: T
): [T, (value: T) => void] {
  const setValue = useCallback(
    (newValue: T) => {
      if (!documentId) {
        return
      }

      setViewStateValue(documentId, key, newValue)
    },
    [documentId, key]
  )

  const value =
    (documentId && getViewStateValue(documentId, key)) ?? initialValue

  return [value, setValue]
}
