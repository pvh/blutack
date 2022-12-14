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
      <div className="NavigationBar Inline">
        <NewDocumentButton
          onCreateDocument={onCreateDocument}
          trigger={
            <button type="button" className="TitleBar-menuItem">
              <i className="fa fa-plus" />
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
          <Badge icon="search" backgroundColor="#00000000" />
        </button>
      </div>

      {currentDocUrl && (
        <>
          <div className="ContentHeader Group">
            <ListItem>
              <Content url={currentDocUrl} context="badge" />
              <Content url={currentDocUrl} context="title" editable />
            </ListItem>
          </div>
          <div className="CollaboratorsBar Inline">
            <Authors
              currentDocUrl={currentDocUrl}
              workspaceDocId={workspaceDocId}
            />
            <div className="TitleBar-self">
              <Content
                url={createDocumentLink("contact", workspaceDoc.selfId)}
                context="badge"
                isPresent
              />
            </div>
          </div>
        </>
      )}
      <div className="TitleBar-unseenChanges">
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
