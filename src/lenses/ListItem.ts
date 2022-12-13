// This file defines logic for mapping a content type to a list item.
// It's meant to be a crude approximation of a set of cambria lenses that would
// bidirectionally (ie, read/writeable) map any doc to a list item

import { LookupResult } from "../components/pushpin-code/ContentTypes"

type ListItem = {
  title: string // todo: should this be optional?
  titleEditorField: string | null
  badgeCount?: number
}

export const docToListItem = (doc: any, type: string): ListItem => {
  let title, titleEditorField, badgeCount

  if (type === "text") {
    const lines = doc.text
      //  @ts-ignore-next-line
      .join("")
      .split("\n")
      .filter((l: string) => l.length > 0)

    title = doc.title || lines.shift() || "[empty text note]"
    titleEditorField = "title"
  } else if (Object.keys(doc).includes("title")) {
    title = doc.title
    titleEditorField = "title"
  } else {
    title = "Unknown doc"
    titleEditorField = null
  }

  // todo: set badge count

  return {
    title,
    titleEditorField,
    badgeCount,
  }
}
