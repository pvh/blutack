import React, { useCallback } from "react"
import ReactTags from "react-tag-autocomplete"

import { TaskDoc } from "."

interface TaskTagsProps {
  doc: TaskDoc
  changeDoc: Function
  // todo: suggestions from other tasks?
}

export function TaskTags(props: TaskTagsProps) {
  const { doc, changeDoc } = props

  const handleDelete = useCallback(
    (i: number) => {
      changeDoc((doc: TaskDoc) => {
        doc.tags.splice(i, 1)
      })
    },
    [changeDoc]
  )

  const handleAddition = useCallback(
    (tag: string) => {
      changeDoc((doc: TaskDoc) => {
        doc.tags.push(tag)
      })
    },
    [changeDoc]
  )

  const { tags } = doc

  return (
    <ReactTags
      tags={tags}
      allowNew
      onDelete={handleDelete}
      onAddition={handleAddition}
    />
  )
}
