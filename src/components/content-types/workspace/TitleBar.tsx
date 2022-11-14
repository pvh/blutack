import React, { useState, useCallback } from "react"
import { DocumentId } from "automerge-repo"
import { useDocument } from "automerge-repo-react-hooks"

import Omnibox from "./omnibox/Omnibox"
import Content from "../../Content"
import Authors from "./Authors"
import {
  PushpinUrl,
  createDocumentLink,
  createWebLink,
} from "../../pushpin-code/ShareLink"
import { useEvent } from "../../pushpin-code/Hooks"

import "./TitleBar.css"
import { WorkspaceDoc as WorkspaceDoc } from "./Workspace"
import Badge from "../../ui/Badge"

import "./TitleBar.css"
import NewDocumentButton from "../../NewDocumentButton"

export interface Props {
  documentId: DocumentId
  openDoc: Function
  onContent: (url: PushpinUrl) => boolean
}

export default function TitleBar(props: Props) {
  const [activeOmnibox, setActive] = useState(false)
  const [workspaceDoc] = useDocument<WorkspaceDoc>(props.documentId)

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
    window.location.href = createWebLink(window.location, contentUrl)
  }, [])

  function showOmnibox() {
    setActive(true)
  }

  function hideOmnibox() {
    setActive(false)
  }

  if (!workspaceDoc || !workspaceDoc.currentDocUrl) {
    return null
  }

  return (
    <div className="TitleBar">
      <NewDocumentButton
        onCreateDocument={onCreateDocument}
        trigger={
          <button type="button" className="TitleBar-menuItem">
            <i className="fa fa-plus" />
          </button>
        }
      />

      <div className="NavigationBar Inline">
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

      <div className="ContentHeader Group">
        <Content
          url={workspaceDoc.currentDocUrl}
          context="title-bar"
          editable
        />
      </div>
      <div className="CollaboratorsBar Inline">
        <Authors
          currentDocUrl={workspaceDoc.currentDocUrl}
          workspaceDocId={props.documentId}
        />
        <div className="TitleBar-self">
          <Content
            url={createDocumentLink("contact", workspaceDoc.selfId)}
            context="title-bar"
            isPresent
          />
        </div>
      </div>
      <Omnibox
        active={activeOmnibox}
        documentId={props.documentId}
        omniboxFinished={hideOmnibox}
        onContent={props.onContent}
      />
    </div>
  )
}
