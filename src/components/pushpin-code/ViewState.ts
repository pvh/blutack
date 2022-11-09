import { useState, useEffect, useContext, useCallback } from "react"
import { parseDocumentLink, createDocumentLink, PushpinUrl } from "./ShareLink"
import { useTimeouts, useMessaging } from "./Hooks"
import { useSelfId } from "./SelfHooks"
import { CurrentDeviceContext } from "../content-types/workspace/Device"
import { ContactDoc } from "../content-types/contact"
import { ChannelId, DocumentId } from "automerge-repo"
import { useDocument, useRepo } from "automerge-repo-react-hooks"
import { init } from "@automerge/automerge"

interface DocWithViewState {
  __viewState: { [userId: DocumentId]: { [key: string]: any } }
}

/**
 * Store view state per user in the document
 */
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
        let viewState = doc.__viewState
        if (!viewState) {
          viewState = doc.__viewState = {}
        }

        let selfViewState = viewState[selfId]
        if (!selfViewState) {
          selfViewState = viewState[selfId] = {}
        }

        selfViewState[key] = newValue
      })
    },
    [key, changeDoc]
  )

  const value = doc?.__viewState?.[selfId]?.[key] ?? initialValue

  return [value, setValue]
}
