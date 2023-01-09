import React, { useCallback, useEffect, useState } from "react"

import { ContentType } from "../pushpin-code/ContentTypes"
import { useDocument } from "automerge-repo-react-hooks"
import "./TextContent.css"
import { ContentProps } from "../Content"
import "./RawView.css"
import ReactJson, { InteractionProps, OnSelectProps } from "react-json-view"
import {
  createDocumentLink,
  isPushpinUrl,
  openDoc,
  parseDocumentLink,
  PushpinUrl,
} from "../pushpin-code/Url"
import { DocumentId } from "automerge-repo"

export default function RawView(props: ContentProps) {
  const [doc, changeDoc] = useDocument(props.documentId)
  const [isMetaPressed, setIsAltPressed] = useState<boolean>(false)

  const onEdit = useCallback(
    ({ namespace, new_value, name }: InteractionProps) => {
      changeDoc((doc) => {
        let current: any = doc

        for (const key of namespace) {
          current = current[key as string]
        }

        current[name as string] = new_value
      })
    },
    [changeDoc]
  )

  const onAdd = useCallback(() => true, [])
  const onDelete = useCallback(
    ({ namespace, name }: InteractionProps) => {
      changeDoc((doc) => {
        let current: any = doc

        for (const key of namespace) {
          current = current[key as string]
        }

        delete current[name as string]
      })
    },
    [changeDoc]
  )

  const onSelect = useCallback(
    ({ value }: OnSelectProps) => {
      if (!(typeof value === "string")) {
        return
      }

      if (isPushpinUrl(value)) {
        openDoc(
          isMetaPressed
            ? createDocumentLink("raw", parseDocumentLink(value as PushpinUrl).documentId)
            : (value as PushpinUrl)
        )
      } else if (isDocumentId(value)) {
        openDoc(createDocumentLink("raw", value as DocumentId))
      }
    },
    [changeDoc]
  )

  useEffect(() => {
    const onKeyDown = (evt: KeyboardEvent) => {
      setIsAltPressed(evt.altKey)
    }
    const onKeyUp = (evt: KeyboardEvent) => {
      setIsAltPressed(evt.altKey)
    }

    document.addEventListener("keydown", onKeyDown, true)
    document.addEventListener("keyup", onKeyUp, true)

    return () => {
      document.removeEventListener("keydown", onKeyDown, true)
      document.removeEventListener("keyup", onKeyUp, true)
    }
  }, [setIsAltPressed])

  if (!doc) {
    return null
  }

  return (
    <div className="RawView">
      <ReactJson src={doc} onEdit={onEdit} onAdd={onAdd} onDelete={onDelete} onSelect={onSelect} />
    </div>
  )
}

function isDocumentId(value: any) {
  return /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/.test(
    value
  )
}

export const contentType: ContentType = {
  type: "raw",
  name: "Raw",
  icon: "file-code",
  contexts: {
    root: RawView,
    board: RawView,
    expanded: RawView,
  },
  unlisted: true,
  dontAddToViewedDocUrls: true,
}
