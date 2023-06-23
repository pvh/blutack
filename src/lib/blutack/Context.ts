import { createContext, useContext } from "react";
import { DocumentId } from "automerge-repo";
import { Doc, Extend } from "@automerge/automerge";
import { useDocument } from "automerge-repo-react-hooks";

export const ProfileContext = createContext(undefined)

export function useProfileId(): DocumentId {
  const context = useContext(ProfileContext)
  if (!context) {
    throw new Error("Missing workspace context")
  }

  return context
}

export function useProfile(): [
  doc: Doc<any> | undefined,
  changeFn: (cf: (d: Extend<any>) => void) => void
] {
  const profileId = useProfileId()
  return useDocument(profileId)
}