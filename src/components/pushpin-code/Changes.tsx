import { createContext, useCallback, useContext, useEffect } from "react"
import { DocumentId } from "automerge-repo"
import { WorkspaceDoc } from "../content-types/workspace/Workspace"
import { useDocument } from "automerge-repo-react-hooks"
import * as ContentTypes from "../pushpin-code/ContentTypes"
import { parseDocumentLink } from "./Url"
import { Doc, getHeads, Heads } from "@automerge/automerge"
import { UnseenChangesDoc } from "../content-types/UnseenChangesDoc"

const UnseenChangesDocIdContext = createContext<DocumentId | undefined>(
  undefined
)

interface UnseenChangesDocProviderProps extends React.PropsWithChildren {
  workspaceDocId: DocumentId
}

interface WorkspaceDocWithUnseenChangesDoc extends WorkspaceDoc {
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
  docId: DocumentId
): [Heads | undefined, () => void] {
  const unseenChangesDocId = useContext(UnseenChangesDocIdContext)
  const [unseenChangesDoc, changeUnseenChangesDoc] =
    useDocument<UnseenChangesDoc>(unseenChangesDocId)
  const [doc] = useDocument(docId)

  const forwardLastSeenHeads = useCallback(() => {
    changeUnseenChangesDoc((unseenChangesDoc) => {
      if (!doc) {
        return
      }

      unseenChangesDoc.headsByDocId[docId] = getHeads(doc)
    })
  }, [doc, changeUnseenChangesDoc])

  if (!doc || !unseenChangesDoc || !unseenChangesDoc.headsByDocId) {
    return [undefined, forwardLastSeenHeads]
  }

  return [unseenChangesDoc.headsByDocId[docId], forwardLastSeenHeads]
}

export function hasDocumentChangedSince(document: Doc<any>, heads: Heads) {
  const docHeads = getHeads(document)

  if (docHeads.length !== heads.length) {
    return false
  }

  return !heads.every((head) => {
    return docHeads.includes(head)
  })
}
