// This file defines logic for mapping a content type to a HasTitle schema.
// It's meant to be a crude approximation of a set of cambria lenses that would
// bidirectionally (ie, read/writeable) map any doc to a thing that has a title

export type HasTitle = {
  title: string
  subtitle?: string
  titleEditorField: string | null
}

export const readAsHasTitle = (doc: any, type: string): HasTitle => {
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
    const title = doc.title != null && doc.title !== "" ? doc.title : "Untitled List"
    const items = doc.content.length
    const subtitle = `${items} item${items !== 1 ? "s" : ""}`

    return {
      title,
      titleEditorField: "title",
      subtitle,
    }
  } else if (type === "board") {
    const title = doc.title != null && doc.title !== "" ? doc.title : "Untitled Board"
    const cardLength = Object.keys(doc.cards).length
    const subtitle = `${cardLength} item${cardLength !== 1 ? "s" : ""}`

    return {
      title,
      titleEditorField: "title",
      subtitle,
    }
  } else if (type === "contact") {
    const title = doc.name || "Untitled Contact"
    return {
      title,
      titleEditorField: "name",
    }
  } else if (type === "thread") {
    const title = doc.title ? doc.title : "Untitled Thread"
    return {
      title,
      titleEditorField: "title",
    }
  } else if (type === "widget") {
    const title = doc.title ? doc.title : "Untitled Widget"
    return {
      title,
      titleEditorField: "title",
    }
  } else if (Object.keys(doc).includes("title")) {
    const title = doc.title != null && doc.title !== "" ? doc.title : "Untitled"
    return {
      title,
      titleEditorField: "title",
    }
  } else if (Object.keys(doc).includes("name")) {
    const title = doc.name != null && doc.name !== "" ? doc.name : "Untitled"
    return {
      title,
      titleEditorField: "name",
    }
  } else {
    const name = doc.name != null && doc.name !== "" ? doc.name : `Unnamed ${type}`
    return {
      title: name,
      titleEditorField: "name",
    }
  }
}
