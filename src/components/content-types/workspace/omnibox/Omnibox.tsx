import React, { useRef, useState, useCallback, useEffect } from "react"
import Debug from "debug"
import classNames from "classnames"

import { PushpinUrl } from "../../../../lib/blutack/Url"
import { useEvent } from "../../../../lib/blutack/Hooks"
import { DocumentId } from "automerge-repo"
import { useRepo } from "automerge-repo-react-hooks"
import OmniboxWorkspaceListMenu from "./OmniboxWorkspaceListMenu"

import "./Omnibox.css"

const log = Debug("pushpin:omnibox")

export interface Props {
  active: boolean
  workspaceDocId: DocumentId
  omniboxFinished: Function
  onContent: (url: PushpinUrl) => boolean
  closeOnClickOutside?: boolean
}

export default function Omnibox({
  active,
  workspaceDocId,
  omniboxFinished,
  onContent,
  closeOnClickOutside = true,
}: Props) {
  const omniboxInput = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState("")

  const onInputChange = useCallback((e: any /* FIXME */) => {
    setSearch(e.target.value)
  }, [])

  const omniboxRef = useRef<HTMLDivElement>(null)
  useEvent(window, "click", (event) => {
    if (!omniboxRef.current) {
      return
    }
    if (
      active &&
      event.target !== omniboxRef.current &&
      !omniboxRef.current.contains(event.target) &&
      closeOnClickOutside
    ) {
      omniboxFinished()
    }
  })

  useEffect(() => {
    if (active && omniboxInput.current) {
      setSearch("")
      omniboxInput.current.value = ""
      omniboxInput.current.select()
    }
  }, [active])

  const stopPropagation = useCallback((e: React.SyntheticEvent) => {
    e.stopPropagation()
    e.nativeEvent.stopImmediatePropagation()
  }, [])

  const repo = useRepo()

  log("render")

  return (
    <div
      className={classNames(
        `Omnibox`,
        active ? "Omnibox--active" : "Omnibox--inactive"
      )}
      ref={omniboxRef}
      onPaste={stopPropagation}
    >
      <div className="Omnibox-header">
        <input
          className="Omnibox-input"
          type="text"
          ref={omniboxInput}
          onChange={onInputChange}
          value={search}
          placeholder="Search..."
        />
      </div>
      <div className="Omnibox-Workspace">
        <OmniboxWorkspaceListMenu
          active={active}
          search={search}
          onContent={onContent}
          workspaceDocId={workspaceDocId}
          omniboxFinished={omniboxFinished}
        />
      </div>
    </div>
  )
}
