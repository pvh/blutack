import React, { useState, useCallback, useEffect } from "react"
import { DocumentId } from "@automerge/automerge-repo"
import { useDocument } from "@automerge/automerge-repo-react-hooks"

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
import ListItem from "../../ui/ListItem"
import NotificationSetting from "./NotificationSetting"
import classNames from "classnames"

export interface Props {
  workspaceDocId: DocumentId
  currentDocUrl?: PushpinUrl
  onContent: (url: PushpinUrl) => boolean
}

export default function TitleBar({ workspaceDocId, currentDocUrl, onContent }: Props) {
  const [activeOmnibox, setActive] = useState(false)
  const [workspaceDoc] = useDocument<WorkspaceDoc>(workspaceDocId)

  useEffect(() => {
    if (!currentDocUrl) {
      setActive(true)
    }
  }, [currentDocUrl])

  useEvent(document, "keydown", (e) => {
    if (
      (e.key === "k" || e.key === "p") &&
      (e.metaKey || e.ctrlKey) &&
      document.activeElement === document.body
    ) {
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
        <Content
          url={createDocumentLink("contact", workspaceDoc.selfId)}
          context="badge"
          isPresent
        />
        <ChangedDocsList workspaceDocId={workspaceDocId}></ChangedDocsList>
        <NewDocumentButton
          onCreateDocument={onCreateDocument}
          trigger={<Badge icon="plus" size="medium" backgroundColor="transparent" />}
        />
        <div
          onClick={(e) => {
            showOmnibox()
            e.stopPropagation()
          }}
        >
          <Badge icon="search" size="medium" backgroundColor="transparent" />
        </div>
      </div>

      <div className="TitleBar-section stretch withDividers">
        {currentDocUrl && (
          <>
            <div className="ContentHeader Group">
              <ListItem>
                <Content url={currentDocUrl} context="badge" />
                <Content url={currentDocUrl} context="title" editable />
              </ListItem>
            </div>
            <div className="CollaboratorsBar Inline">
              <Authors currentDocUrl={currentDocUrl} workspaceDocId={workspaceDocId} />
            </div>
          </>
        )}
      </div>
      <div className="TitleBar-section">
        {currentDocUrl && <NotificationSetting currentDocumentUrl={currentDocUrl} />}
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
