// This file defines logic for mapping a content type to a list item.
// It's meant to be a crude approximation of a set of cambria lenses that would
// bidirectionally (ie, read/writeable) map any doc to a list item

import { Doc, getHeads } from "@automerge/automerge"
import { memoize } from "lodash"
import { ThreadDoc } from "../components/content-types/ThreadContent"
import {
  getUnseenPatches,
  LastSeenHeads,
} from "../components/pushpin-code/Changes"

type ListItem = {
  title: string // todo: should this be optional?
  titleEditorField: string | null
  unseenChanges: { changes: true; count?: number } | { changes: false }
}

export const docToListItem = (
  doc: any,
  type: string,
  lastSeenHeads: LastSeenHeads | undefined
): ListItem => {
  const { title, titleEditorField } = getTitle(doc, type)
  const unseenChanges = getUnseenChanges(doc, type)

  return {
    title,
    titleEditorField,
    unseenChanges,
  }
}

const getTitle = (
  doc: any,
  type: string
): { title: string; titleEditorField: string | null } => {
  if (type === "text") {
    const lines = doc.text
      //  @ts-ignore-next-line
      .join("")
      .split("\n")
      .filter((l: string) => l.length > 0)

    return {
      title: doc.title || lines.shift() || "[empty text note]",
      titleEditorField: "title",
    }
  } else if (Object.keys(doc).includes("title")) {
    return {
      title: doc.title,
      titleEditorField: "title",
    }
  } else {
    return {
      title: "Unknown doc",
      titleEditorField: null,
    }
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

const getUnreadMessageCountOfThread = memoize(
  (doc: ThreadDoc, lastSeenHeads?: LastSeenHeads) => {
    // count any splice on the messages property of the thread document as a change
    return getUnseenPatches(doc, lastSeenHeads).filter(
      (patch) =>
        patch.action === "splice" &&
        patch.path.length === 2 &&
        patch.path[0] === "messages"
    ).length
  },
  (doc, lastSeenHeads) =>
    `${getHeads(doc).join(",")}:${JSON.stringify(lastSeenHeads)}`
)

const textHasUnseenChanges = memoize(
  (doc: Doc<unknown>, lastSeenHeads?: LastSeenHeads) => {
    return getUnseenPatches(doc, lastSeenHeads).some(
      (patch) =>
        patch.action === "splice" &&
        patch.path.length === 2 &&
        patch.path[0] === "text"
    )
  },
  (doc, lastSeenHeads) =>
    `${getHeads(doc).join(",")}:${JSON.stringify(lastSeenHeads)}`
)
