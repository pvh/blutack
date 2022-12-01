import { useCallback, useContext, useEffect } from "react"
import {
  WorkspaceContext,
  WorkspaceDoc,
} from "../content-types/workspace/Workspace"
import { useDocument } from "automerge-repo-react-hooks"
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

export function useAdvanceLastSeenHeads(docUrl: PushpinUrl) {
  const workspaceId = useContext(WorkspaceContext)
  const [, changeWorkspaceDoc] = useDocument<WorkspaceDoc>(workspaceId)
  const [doc] = useDocument(parseDocumentLink(docUrl).documentId)

  return useCallback(() => {
    changeWorkspaceDoc((workspaceDoc) => {
      if (!doc) {
        return
      }

      let lastSeenHeadsByDocUrl = workspaceDoc.persistedLastSeenHeads
      if (!lastSeenHeadsByDocUrl) {
        workspaceDoc.persistedLastSeenHeads = {}
        // need to read persistedLastSeenHeads from workspaceDoc again, so we get the proxied automerge object
        lastSeenHeadsByDocUrl = workspaceDoc.persistedLastSeenHeads
      }

      lastSeenHeadsByDocUrl[docUrl] = getHeads(doc)
    })
  }, [doc, changeWorkspaceDoc])
}

const CURRENTLY_VIEWED_DOC_URLS: { [url: PushpinUrl]: boolean } = {}

function isDocUrlCurrentlyViewed(url: PushpinUrl): boolean {
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

export interface LastSeenHeadsMap {
  [url: PushpinUrl]: LastSeenHeads
}

export interface PersistedLastSeenHeadsMap {
  [url: PushpinUrl]: Heads
}

export function useLastSeenHeads(
  docUrl: PushpinUrl
): LastSeenHeads | undefined {
  const workspaceId = useContext(WorkspaceContext)
  const [workspaceDoc] = useDocument<WorkspaceDoc>(workspaceId)

  if (CURRENTLY_VIEWED_DOC_URLS[docUrl]) {
    return "latestHeads"
  }

  if (!workspaceDoc || !workspaceDoc.persistedLastSeenHeads) {
    return undefined
  }

  return workspaceDoc.persistedLastSeenHeads[docUrl]
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
  if (!lastSeenHeads) {
    return true
  }

  if (lastSeenHeads === "latestHeads") {
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

export function getLastSeenHeadsMapOfWorkspace(workspace: WorkspaceDoc) {
  if (!workspace.persistedLastSeenHeads) {
    return {}
  }

  const lastSeenHeadsByDocUrl: LastSeenHeadsMap = {}

  // replace persisted head with special value "latestHeads" if view is currently being viewed
  Object.entries(workspace.persistedLastSeenHeads).forEach(
    ([docUrl, lastSeenHeads]) => {
      lastSeenHeadsByDocUrl[docUrl as PushpinUrl] = isDocUrlCurrentlyViewed(
        docUrl as PushpinUrl
      )
        ? "latestHeads"
        : lastSeenHeads
    }
  )

  return lastSeenHeadsByDocUrl
}
