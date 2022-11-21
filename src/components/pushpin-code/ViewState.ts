import React, { useCallback, useContext } from "react"
import { DocumentId } from "../../../../automerge-repo"
import { setViewStateValue } from "../Url"

export const ViewStateContext = React.createContext<ViewState | undefined>(
  undefined
)

export interface ViewState {
  [documentId: string]: { [key: string]: any }
}

// equivalent to useState but stores state in the url
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

  const viewState = useContext(ViewStateContext)

  if (!viewState) {
    throw new Error("no ViewStateContext defined")
  }

  const value = (documentId && viewState?.[documentId]?.[key]) ?? initialValue

  return [value, setValue]
}
