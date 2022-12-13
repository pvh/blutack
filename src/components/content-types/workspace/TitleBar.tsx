import React, { useState, useCallback, useEffect } from "react"
import { DocumentId } from "automerge-repo"
import { useDocument } from "automerge-repo-react-hooks"

import Omnibox from "./omnibox/Omnibox"
import Content from "../../Content"
import Authors from "./Authors"
import {
  PushpinUrl,
  createDocumentLink,
  createWebLink,
  parseDocumentLink,
} from "../../pushpin-code/Url"
import { useEvent } from "../../pushpin-code/Hooks"

import "./TitleBar.css"
import { WorkspaceDoc as WorkspaceDoc } from "./Workspace"
import Badge from "../../ui/Badge"

import "./TitleBar.css"
import NewDocumentButton from "../../NewDocumentButton"
import { openDoc } from "../../pushpin-code/Url"
import { ChangedDocsList } from "./ChangedDocsList"
import { getLastSeenHeadsMapOfWorkspace } from "../../pushpin-code/Changes"
import NotificationSetting from "./NotificationSetting"

export interface Props {
  workspaceDocId: DocumentId
  currentDocUrl?: PushpinUrl
  onContent: (url: PushpinUrl) => boolean
}

export default function TitleBar({
  workspaceDocId,
  currentDocUrl,
  onContent,
}: Props) {
  const [activeOmnibox, setActive] = useState(false)
  const [workspaceDoc] = useDocument<WorkspaceDoc>(workspaceDocId)

  const currentDocId = currentDocUrl
    ? parseDocumentLink(currentDocUrl).documentId
    : undefined

  useEffect(() => {
    if (!currentDocUrl) {
      setActive(true)
    }
  }, [currentDocUrl])

  useEvent(document, "keydown", (e) => {
    if (e.key === "/" && document.activeElement === document.body) {
      if (!activeOmnibox) {
        showOmnibox()
        e.preventDefault()
      }
    }

    if (e.key === "Escape" && activeOmnibox) {
      hideOmnibox()
      e.preventDefault()
    }
  })

  const onCreateDocument = useCallback((contentUrl: PushpinUrl) => {
    openDoc(contentUrl)
  }, [])

  function showOmnibox() {
    setActive(true)
  }

  function hideOmnibox() {
    setActive(false)
  }

  if (!workspaceDoc || !workspaceDoc.selfId) {
    return null
  }

  return (
    <div className="TitleBar">
      <div className="TitleBar-section">
        <NewDocumentButton
          onCreateDocument={onCreateDocument}
          trigger={
            <button type="button" className="TitleBar-menuItem">
              <Badge icon="plus" backgroundColor="transparent" />
            </button>
          }
        />
        <button
          type="button"
          onClick={(e) => {
            showOmnibox()
            e.stopPropagation()
          }}
          className="TitleBar-menuItem"
        >
          <Badge icon="search" backgroundColor="transparent" />
        </button>
      </div>

      <div className="TitleBar-section stretch">
        {currentDocUrl && (
          <>
            <Content url={currentDocUrl} context="title-bar" editable />
            <Authors
              currentDocUrl={currentDocUrl}
              workspaceDocId={workspaceDocId}
            />
          </>
        )}
      </div>

      <div className="TitleBar-section leftDivider">
        <Content
          url={createDocumentLink("contact", workspaceDoc.selfId)}
          context="title-bar"
          isPresent
        />
        {currentDocId && <NotificationSetting documentId={currentDocId} />}
        <ChangedDocsList
          lastSeenHeads={getLastSeenHeadsMapOfWorkspace(workspaceDoc)}
        ></ChangedDocsList>
      </div>

      <Omnibox
        active={activeOmnibox}
        workspaceDocId={workspaceDocId}
        omniboxFinished={hideOmnibox}
        onContent={onContent}
        closeOnClickOutside={currentDocUrl !== undefined}
      />
    </div>
  )
}
