import { useEffect, useCallback, createContext } from "react"
import { useSelfId } from "./SelfHooks"
import { useDocument } from "automerge-repo-react-hooks"
import { DocumentId } from "../../../../automerge-repo"
import { createDocumentLink, createWebLink, PushpinUrl } from "./ShareLink"

export interface DocWithViewState {
  __userStates: { [userId: DocumentId]: { [key: string]: any } }
}

// equivalent to useState but stores state per user in the document
export function useViewState<T>(
  documentId: DocumentId | undefined,
  key: string,
  initialValue?: T
): [T, (value: T) => void] {
  const selfId = useSelfId()
  const [doc, changeDoc] = useDocument<DocWithViewState>(documentId)

  const setValue = useCallback(
    (newValue: T) => {
      changeDoc((doc) => {
        let userStates = doc.__userStates
        if (!userStates) {
          userStates = doc.__userStates = {}
        }

        let userState = userStates[selfId]
        if (!userState) {
          userState = userStates[selfId] = {}
        }

        if (newValue === undefined) {
          delete userState[key]
        } else {
          userState[key] = newValue
        }
      })
    },
    [key, changeDoc]
  )

  const value = doc?.__userStates?.[selfId]?.[key] ?? initialValue

  return [value, setValue]
}

export function getViewStateOfUser(
  doc: DocWithViewState,
  userId: DocumentId
): { [key: string]: any } {
  return doc?.__userStates?.[userId]
}

export function loadViewStateForUser(
  doc: DocWithViewState,
  viewState: { [key: string]: any },
  userId: DocumentId
) {
  let userStates = doc.__userStates
  if (!userStates) {
    userStates = doc.__userStates = {}
  }

  userStates[userId] = viewState
}
