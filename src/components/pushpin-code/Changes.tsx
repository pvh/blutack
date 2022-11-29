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

export function useLastSeenHeads(
  docUrl: PushpinUrl
): [Heads | undefined, () => void] {
  const unseenChangesDocId = useContext(UnseenChangesDocIdContext)
  const [unseenChangesDoc, changeUnseenChangesDoc] =
    useDocument<UnseenChangesDoc>(unseenChangesDocId)
  const docId = parseDocumentLink(docUrl).documentId
  const [doc] = useDocument(docId)

  const advanceLastSeenHeads = useCallback(() => {
    changeUnseenChangesDoc((unseenChangesDoc) => {
      if (!doc) {
        return
      }

      console.log("advance")

      unseenChangesDoc.headsByDocUrl[docUrl] = getHeads(doc)
    })
  }, [doc, changeUnseenChangesDoc])

  if (!doc || !unseenChangesDoc || !unseenChangesDoc.headsByDocUrl) {
    return [undefined, advanceLastSeenHeads]
  }

  return [unseenChangesDoc.headsByDocUrl[docUrl], advanceLastSeenHeads]
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

export function getPatchesSince(doc: Doc<any>, heads: Heads) {
  const patches: Patch[] = []

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
