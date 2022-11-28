import { createContext, useEffect } from "react"
import { DocumentId } from "automerge-repo"
import { WorkspaceDoc } from "../content-types/workspace/Workspace"
import { useDocument } from "automerge-repo-react-hooks"
import * as ContentTypes from "../pushpin-code/ContentTypes"
import { parseDocumentLink } from "./Url"

const UnseenChangesDocContext = createContext<DocumentId | undefined>(undefined)

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
    <UnseenChangesDocContext.Provider value={value}>
      {children}
    </UnseenChangesDocContext.Provider>
  )
}

export function useChangeTracking() {}
