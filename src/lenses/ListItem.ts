// This file defines logic for mapping a content type to a list item.
// It's meant to be a crude approximation of a set of cambria lenses that would
// bidirectionally (ie, read/writeable) map any doc to a list item

import { hasUnseenChanges as textHasUnseenChanges } from "../components/content-types/TextContent"
import { getUnreadMessageCountOfThread } from "../components/content-types/ThreadContent"
import { LastSeenHeads } from "../components/pushpin-code/Changes"

type ListItem = {
  title: string
  subtitle?: string
  titleEditorField: string | null
  unseenChanges: { changes: true; count?: number } | { changes: false }
  badgeColor?: string
}

export const docToListItem = (
  doc: any,
  type: string,
  lastSeenHeads: LastSeenHeads | undefined
): ListItem => {
  const { title, titleEditorField, subtitle } = getTitle(doc, type)
  const unseenChanges = getUnseenChanges(doc, type, lastSeenHeads)
  const badgeColor = getBadgeColor(doc, type)

  return {
    title,
    titleEditorField,
    subtitle,
    unseenChanges,
    badgeColor,
  }
}

const getTitle = (
  doc: any,
  type: string
): { title: string; titleEditorField: string | null; subtitle?: string } => {
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
  } else if (type === "contentlist") {
    const title =
      doc.title != null && doc.title !== "" ? doc.title : "Untitled List"
    const items = doc.content.length
    const subtitle = `${items} item${items !== 1 ? "s" : ""}`

    return {
      title,
      titleEditorField: "title",
      subtitle,
    }
  } else if (type === "board") {
    const title =
      doc.title != null && doc.title !== "" ? doc.title : "Untitled Board"
    const cardLength = Object.keys(doc.cards).length
    const subtitle = `${cardLength} item${cardLength !== 1 ? "s" : ""}`

    return {
      title,
      titleEditorField: "title",
      subtitle,
    }
  } else if (Object.keys(doc).includes("title")) {
    const title = doc.title != null && doc.title !== "" ? doc.title : "Untitled"
    return {
      title,
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
