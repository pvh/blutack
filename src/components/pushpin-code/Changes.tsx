import { createContext, useCallback, useContext, useEffect } from "react"
import { DocumentId } from "automerge-repo"
import { WorkspaceDoc } from "../content-types/workspace/Workspace"
import { useDocument } from "automerge-repo-react-hooks"
import * as ContentTypes from "../pushpin-code/ContentTypes"
import { parseDocumentLink, PushpinUrl } from "./Url"
import {
  Doc,
  getHeads,
  Heads,
  view,
  getChanges,
  applyChanges,
  clone,
  Patch,
} from "@automerge/automerge"
import { UnseenChangesDoc } from "../content-types/UnseenChangesDoc"

const UnseenChangesDocIdContext = createContext<DocumentId | undefined>(
  undefined
)

interface UnseenChangesDocProviderProps extends React.PropsWithChildren {
  workspaceDocId: DocumentId
}

export interface WorkspaceDocWithUnseenChangesDoc extends WorkspaceDoc {
  unseenChangesDocId?: DocumentId
}

export function UnseenChangesDocProvider({
  workspaceDocId,
  children,
}: UnseenChangesDocProviderProps) {
  const [workspaceDoc, changeWorkspaceDoc] =
    useDocument<WorkspaceDocWithUnseenChangesDoc>(workspaceDocId)

  useEffect(() => {
    if (
      !workspaceDoc ||
      !workspaceDoc.selfId ||
      workspaceDoc.unseenChangesDocId
    ) {
      return
    }

    ContentTypes.create("unseenChangesDoc", {}, (unseenChangesDocUrl) => {
      changeWorkspaceDoc((ws) => {
        ws.viewedDocUrls = ws.viewedDocUrls.filter(
          (url) => url !== unseenChangesDocUrl
        )
        ws.viewedDocUrls.unshift(unseenChangesDocUrl)

        ws.unseenChangesDocId =
          parseDocumentLink(unseenChangesDocUrl).documentId
      })
    })
  }, [workspaceDoc])

  const value = workspaceDoc && workspaceDoc.unseenChangesDocId

  return (
    <UnseenChangesDocIdContext.Provider value={value}>
      {children}
    </UnseenChangesDocIdContext.Provider>
  )
}

export function useAdvanceLastSeenHeads(docUrl: PushpinUrl) {
  const unseenChangesDocId = useContext(UnseenChangesDocIdContext)
  const [, changeUnseenChangesDoc] =
    useDocument<UnseenChangesDoc>(unseenChangesDocId)
  const [doc] = useDocument(parseDocumentLink(docUrl).documentId)

  return useCallback(() => {
    changeUnseenChangesDoc((unseenChangesDoc) => {
      if (!doc) {
        return
      }

      unseenChangesDoc.headsByDocUrl[docUrl] = getHeads(doc)
    })
  }, [doc, changeUnseenChangesDoc])
}

const CURRENTLY_VIEWED_DOC_URLS: { [url: PushpinUrl]: boolean } = {}

export function isDocUrlCurrentlyViewed(url: PushpinUrl): boolean {
  return CURRENTLY_VIEWED_DOC_URLS[url] ?? false
}

export function useAutoAdvanceLastSeenHeads(docUrl: PushpinUrl) {
  const [doc] = useDocument(parseDocumentLink(docUrl).documentId)
  const advanceLastSeenHeads = useAdvanceLastSeenHeads(docUrl)

  useEffect(() => {
    CURRENTLY_VIEWED_DOC_URLS[docUrl] = true

    return () => {
      delete CURRENTLY_VIEWED_DOC_URLS[docUrl]
    }
  }, [docUrl])

  useEffect(() => {
    advanceLastSeenHeads()
  }, [doc])
}

export type LastSeenHeads = Heads | "latestHeads"

export function useLastSeenHeads(
  docUrl: PushpinUrl
): LastSeenHeads | undefined {
  const unseenChangesDocId = useContext(UnseenChangesDocIdContext)
  const [unseenChangesDoc] = useDocument<UnseenChangesDoc>(unseenChangesDocId)

  if (CURRENTLY_VIEWED_DOC_URLS[docUrl]) {
    return "latestHeads"
  }

  if (!unseenChangesDoc || !unseenChangesDoc.headsByDocUrl) {
    return undefined
  }

  return unseenChangesDoc.headsByDocUrl[docUrl]
}

export function getUnseenPatches(
  doc: Doc<any>,
  lastSeenHeads?: LastSeenHeads
): Patch[] {
  const patches: Patch[] = []

  if (!hasDocUnseenChanges(doc, lastSeenHeads)) {
    return []
  }

  try {
    const oldDoc = clone(view(doc, lastSeenHeads as Heads))

    applyChanges(oldDoc, getChanges(oldDoc, doc), {
      patchCallback: (patch: Patch) => {
        patches.push(patch)
      },
    })

    return patches
  } catch (err) {
    console.error(err)
    return []
  }
}

export function hasDocUnseenChanges(
  doc: Doc<any>,
  lastSeenHeads?: LastSeenHeads
): boolean {
  // if the lastSeenHeads are unknown return false, this avoids showing changes initially if the unseenChangesDoc isn't loaded yet
  if (!lastSeenHeads || lastSeenHeads === "latestHeads") {
    return false
  }

  const docHeads = getHeads(doc)

  if (docHeads.length !== lastSeenHeads.length) {
    return false
  }

  return !lastSeenHeads.every((head, index) => {
    return docHeads[index] === head
  })
}
