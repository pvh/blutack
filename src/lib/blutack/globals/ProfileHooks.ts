import { createContext, useContext } from "react"
import { DocumentId } from "@automerge/automerge-repo"
import { Doc, Extend } from "@automerge/automerge"
import { useDocument } from "@automerge/automerge-repo-react-hooks"

export const ProfileContext = createContext(undefined)

export function useProfileId(): DocumentId {
  const context = useContext(ProfileContext)
  if (!context) {
    throw new Error("Missing profile context")
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

export function usePr(): [
  doc: Doc<any> | undefined,
  changeFn: (cf: (d: Extend<any>) => void) => void
] {
  const profileId = useProfileId()
  return useDocument(profileId)
}
