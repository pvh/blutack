import { ChangeFn, Doc } from "@automerge/automerge"
import { DocumentId } from "@automerge/automerge-repo"
import { useDocument } from "@automerge/automerge-repo-react-hooks"

import React, { useContext } from "react"
import { ContactDoc } from "../DocumentTypes"

// createContext requires a default value...
// which we don't really have a sensible answer for
const SelfContext = React.createContext<DocumentId>("" as DocumentId)

export default SelfContext

export function useSelfId(): DocumentId {
  return useContext(SelfContext)
}

export function useSelf(
  documentId?: DocumentId
): [Doc<ContactDoc>, (changeFn: ChangeFn<ContactDoc>) => void] {
  const selfId = useSelfId()
  return useDocument<ContactDoc>(selfId)
}
