// This file defines logic for mapping a content type to a list item.
// It's meant to be a crude approximation of a set of cambria lenses that would
// bidirectionally (ie, read/writeable) map any doc to a list item

import { hasUnseenChanges as textHasUnseenChanges } from "../components/content-types/TextContent"
import { getUnreadMessageCountOfThread } from "../components/content-types/ThreadContent"
import { LastSeenHeads } from "../components/pushpin-code/Changes"

export type HasBadge = {
  unseenChanges: { changes: true; count?: number } | { changes: false }
  badgeColor?: string
}

export const readAsHasBadge = (
  doc: any,
  type: string,
  lastSeenHeads: LastSeenHeads | undefined
): HasBadge => {
  const unseenChanges = getUnseenChanges(doc, type, lastSeenHeads)
  const badgeColor = getBadgeColor(doc, type)

  return {
    unseenChanges,
    badgeColor,
  }
}

const getUnseenChanges = (
  doc: any,
  type: string,
  lastSeenHeads: LastSeenHeads | undefined
): { changes: true; count?: number } | { changes: false } => {
  switch (type) {
    case "thread": {
      const unreadCount = getUnreadMessageCountOfThread(doc, lastSeenHeads)
      if (unreadCount > 0) {
        return { changes: true, count: unreadCount }
      } else {
        return { changes: false }
      }
    }
    case "text": {
      return { changes: textHasUnseenChanges(doc, lastSeenHeads) }
    }
    default: {
      return { changes: false }
    }
  }
}

const getBadgeColor = (doc: any, type: string): string | undefined => {
  switch (type) {
    case "board": {
      return doc.backgroundColor
    }
    default: {
      return undefined
    }
  }
}
