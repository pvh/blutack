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

export function useAutoAdvanceLastSeenHeads(docUrl: PushpinUrl) {
  const [doc] = useDocument(parseDocumentLink(docUrl).documentId)
  const advanceLastSeenHeads = useAdvanceLastSeenHeads(docUrl)

  useEffect(() => {
    advanceLastSeenHeads()
  }, [doc])
}

export function useLastSeenHeads(docUrl: PushpinUrl): Heads | undefined {
  const unseenChangesDocId = useContext(UnseenChangesDocIdContext)
  const [unseenChangesDoc] = useDocument<UnseenChangesDoc>(unseenChangesDocId)

  return unseenChangesDoc?.headsByDocUrl?.[docUrl]
}

export function getPatchesSince(doc: Doc<any>, heads?: Heads): Patch[] {
  const patches: Patch[] = []

  // TODO: if no head is defined use the head that points to the first version of the document
  if (!heads) {
    return []
  }

  try {
    const oldDoc = clone(view(doc, heads))

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

export function hasDocumentChangedSince(document: Doc<any>, heads: Heads) {
  const docHeads = getHeads(document)

  if (docHeads.length !== heads.length) {
    return false
  }

  return !heads.every((head, index) => {
    return docHeads[index] === head
  })
}
