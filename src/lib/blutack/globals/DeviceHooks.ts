import { Doc, Extend } from "@automerge/automerge"
import { DocumentId } from "@automerge/automerge-repo"
import { useDocument } from "@automerge/automerge-repo-react-hooks"

import React, { useContext } from "react"
import { ContactDoc } from "../DocumentTypes"

// createContext requires a default value...
// which we don't really have a sensible answer for
export const CurrentDeviceContext = React.createContext<DocumentId>("" as DocumentId)

export function useCurrentDeviceId(): DocumentId {
  return useContext(CurrentDeviceContext)
}

export function useCurrentDevice(): [
  doc: Doc<ContactDoc> | undefined,
  changeFn: (cf: (d: Extend<ContactDoc>) => void) => void
] {
  const selfId = useCurrentDeviceId()
  return useDocument<ContactDoc>(selfId)
}
