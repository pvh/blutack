// This file defines logic for mapping a content type to a list item.
// It's meant to be a crude approximation of a set of cambria lenses that would
// bidirectionally (ie, read/writeable) map any doc to a list item

import {
  hasUnseenChanges,
  hasUnseenChanges as textHasUnseenChanges,
  hasUnseenMentions as textHasUnseenMentions,
} from "../components/content-types/TextContent"
import {
  getUnreadMessageCountOfThread,
  hasUnseenMentions as threadHasUnseenMentions,
} from "../components/content-types/ThreadContent"
import { LastSeenHeads } from "../bootstrap/lib/blutack/Changes"
import { DocumentId } from "automerge-repo"
import { shouldNotifyUserAboutDoc } from "../components/content-types/workspace/NotificationSetting"

export type HasBadge = {
  unseenChanges: { changes: true; count?: number; mentions: boolean } | { changes: false }
  notify: boolean
  badgeColor?: string
}

export const readAsHasBadge = (
  doc: any,
  type: string,
  lastSeenHeads: LastSeenHeads | undefined,
  selfId: DocumentId,
  selfName: string
): HasBadge => {
  const unseenChanges = getUnseenChanges(doc, type, lastSeenHeads)
  const badgeColor = getBadgeColor(doc, type)

  if (!unseenChanges.changes) {
    return {
      unseenChanges: { changes: false },
      notify: false,
      badgeColor,
    }
  }

  const mentions = hasUnseenMentions(doc, type, lastSeenHeads, selfName)
  const notify = shouldNotifyUserAboutDoc(doc, selfId, unseenChanges.changes, mentions)

  return {
    unseenChanges: { ...unseenChanges, mentions },
    notify,
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

const hasUnseenMentions = (
  doc: any,
  type: string,
  lastSeenHeads: LastSeenHeads | undefined,
  name: string
): boolean => {
  switch (type) {
    case "thread":
      return threadHasUnseenMentions(doc, lastSeenHeads, name)

    case "text":
      return textHasUnseenMentions(doc, lastSeenHeads, name)

    default:
      return false
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
