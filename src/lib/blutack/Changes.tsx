import { useCallback, useContext, useEffect, useRef } from "react"
import { WorkspaceContext, WorkspaceDoc } from "../../components/content-types/workspace/Workspace"
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
  List,
} from "@automerge/automerge"

import { readAsHasBadge } from "../../lenses/HasBadge"

import memoize from "lodash.memoize"
import { useSelf, useSelfId } from "./SelfHooks"

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

      lastSeenHeadsByDocUrl[docUrl] = getHeads(doc) as List<string>
    })
  }, [doc, changeWorkspaceDoc])
}

const CURRENTLY_VIEWED_DOC_URLS: { [url: PushpinUrl]: boolean } = {}

function isDocUrlCurrentlyViewed(url: PushpinUrl): boolean {
  return CURRENTLY_VIEWED_DOC_URLS[url] ?? false
}

export function useAutoAdvanceLastSeenHeads(docUrl: PushpinUrl) {
  const { documentId, type } = parseDocumentLink(docUrl)
  const [doc] = useDocument(documentId)
  const [self] = useSelf()
  const selfId = useSelfId()
  const advanceLastSeenHeads = useAdvanceLastSeenHeads(docUrl)
  const lastSeenHeads = usePersistedLastSeenHeads(docUrl)
  const hadInitialChanges = useRef<boolean>()
  const initialLastSeenHeadsRef = useRef<Heads>()

  useEffect(() => {
    CURRENTLY_VIEWED_DOC_URLS[docUrl] = true

    return () => {
      delete CURRENTLY_VIEWED_DOC_URLS[docUrl]
    }
  }, [docUrl])

  // advance the head whenever the doc changes
  useEffect(() => {
    if (!self) {
      return
    }

    // before we advance the head initially
    // store if the document had unseen changes initially and what the initial lastSeenHeads was
    if (doc && lastSeenHeads && hadInitialChanges.current === undefined) {
      const hasBadge = readAsHasBadge(doc, type, lastSeenHeads, selfId, self.name)
      hadInitialChanges.current = hasBadge?.unseenChanges.changes
      initialLastSeenHeadsRef.current = lastSeenHeads
    }

    advanceLastSeenHeads()
  }, [doc, self])

  return hadInitialChanges.current ? initialLastSeenHeadsRef.current : undefined
}

export type LastSeenHeads = Heads | "latestHeads"

export interface LastSeenHeadsMap {
  [url: PushpinUrl]: LastSeenHeads
}

export interface PersistedLastSeenHeadsMap {
  [url: PushpinUrl]: Heads
}

function usePersistedLastSeenHeads(docUrl: PushpinUrl): Heads | undefined {
  const workspaceId = useContext(WorkspaceContext)
  const [workspaceDoc, changeWorkspaceDoc] = useDocument<WorkspaceDoc>(workspaceId)

  if (!workspaceDoc || !workspaceDoc.persistedLastSeenHeads) {
    return undefined
  }

  const lastSeenHeads = workspaceDoc.persistedLastSeenHeads[docUrl]

  if (!lastSeenHeads) {
    changeWorkspaceDoc((workspaceDoc) => {
      let lastSeenHeadsByDocUrl = workspaceDoc.persistedLastSeenHeads
      if (!lastSeenHeadsByDocUrl) {
        workspaceDoc.persistedLastSeenHeads = {}
        // need to read persistedLastSeenHeads from workspaceDoc again, so we get the proxied automerge object
        lastSeenHeadsByDocUrl = workspaceDoc.persistedLastSeenHeads
      }

      lastSeenHeadsByDocUrl[docUrl] = [] as unknown as List<string>
    })
  }

  return lastSeenHeads
}

export function useLastSeenHeads(docUrl: PushpinUrl): LastSeenHeads | undefined {
  const lastSeenHeads = usePersistedLastSeenHeads(docUrl)

  if (CURRENTLY_VIEWED_DOC_URLS[docUrl]) {
    return "latestHeads"
  }

  return lastSeenHeads
}

export const getUnseenPatches = memoize(
  (doc: Doc<any>, lastSeenHeads?: LastSeenHeads): Patch[] => {
    const patches: Patch[] = []

    if (!hasDocUnseenChanges(doc, lastSeenHeads)) {
      return []
    }

    try {
      const oldDoc = clone(view(doc, lastSeenHeads as Heads))

      applyChanges(oldDoc, getChanges(oldDoc, doc), {
        patchCallback: (patches: Patch[]) => {
          patches.push(...patches)
        },
      })

      return patches
    } catch (err) {
      console.error(err)
      return []
    }
  },
  (doc, lastSeenHeads) => `${getHeads(doc).join(",")}:${JSON.stringify(lastSeenHeads)}`
)

export function hasDocUnseenChanges(doc: Doc<any>, lastSeenHeads?: LastSeenHeads): boolean {
  if (!lastSeenHeads || lastSeenHeads === "latestHeads") {
    return false
  }

  const docHeads = getHeads(doc)

  if (docHeads.length !== lastSeenHeads.length) {
    return true
  }

  return !areHeadsEqual(lastSeenHeads, docHeads)
}

export function getLastSeenHeadsMapOfWorkspace(workspace: WorkspaceDoc) {
  if (!workspace.persistedLastSeenHeads) {
    return {}
  }

  const lastSeenHeadsByDocUrl: LastSeenHeadsMap = {}

  // replace persisted head with special value "latestHeads" if view is currently being viewed
  Object.entries(workspace.persistedLastSeenHeads).forEach(([docUrl, lastSeenHeads]) => {
    lastSeenHeadsByDocUrl[docUrl as PushpinUrl] = isDocUrlCurrentlyViewed(docUrl as PushpinUrl)
      ? "latestHeads"
      : lastSeenHeads
  })

  return lastSeenHeadsByDocUrl
}

export function areHeadsEqual(a: Heads, b: Heads): boolean {
  return a.every((head, index) => {
    return b[index] === head
  })
}
