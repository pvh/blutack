import React, { useState, useEffect } from "react"
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
  createWebLinkWithViewState,
} from "../../pushpin-code/ShareLink"
import { useEvent } from "../../pushpin-code/Hooks"

import "./TitleBar.css"
import { WorkspaceDoc as WorkspaceDoc } from "./Workspace"
import Badge from "../../ui/Badge"

import "./TitleBar.css"
import {
  DocWithViewState,
  getViewStateOfUser,
} from "../../pushpin-code/ViewState"
import { useSelfId } from "../../pushpin-code/SelfHooks"
import * as ContentTypes from "../../pushpin-code/ContentTypes"

export interface Props {
  documentId: DocumentId
  openDoc: Function
  onContent: (url: PushpinUrl) => boolean
}

export default function TitleBar(props: Props) {
  const [sessionHistory, setHistory] = useState<PushpinUrl[]>([])
  const [historyIndex, setIndex] = useState(0)
  const [activeOmnibox, setActive] = useState(false)
  const [workspaceDoc] = useDocument<WorkspaceDoc>(props.documentId)
  const currentDocUrl = workspaceDoc?.currentDocUrl
  const currentDocId = currentDocUrl
    ? parseDocumentLink(currentDocUrl).documentId
    : undefined
  const [currentDoc, changeCurrentDoc] =
    useDocument<DocWithViewState>(currentDocId)

  const selfId = useSelfId()

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

  const backDisabled = historyIndex === sessionHistory.length - 1
  const forwardDisabled = historyIndex === 0

  useEffect(() => {
    if (!workspaceDoc || !workspaceDoc.currentDocUrl) {
      return
    }

    // Init sessionHistory
    if (sessionHistory.length === 0) {
      setHistory([workspaceDoc.currentDocUrl])
      // If we're opening a new document (as opposed to going back or forward),
      // add it to our sessionHistory and remove all docs 'forward' of the current index
    } else if (workspaceDoc.currentDocUrl !== sessionHistory[historyIndex]) {
      setHistory([
        workspaceDoc.currentDocUrl,
        ...sessionHistory.slice(historyIndex),
      ])
      setIndex(0)
    }
  }, [workspaceDoc, historyIndex, sessionHistory])

  function goBack() {
    if (backDisabled) {
      throw new Error("Can not go back further than session history")
    }
    const newIndex = historyIndex + 1
    props.openDoc(sessionHistory[newIndex])
    setIndex(newIndex)
  }

  function goForward() {
    if (forwardDisabled) {
      throw new Error("Can not go forward past session history")
    }
    const newIndex = historyIndex - 1
    props.openDoc(sessionHistory[newIndex])
    setIndex(newIndex)
  }

  function copyLink(e: React.MouseEvent) {
    if (currentDoc && currentDocUrl) {
      const viewState = getViewStateOfUser(currentDoc, selfId)
      navigator.clipboard.writeText(
        createWebLinkWithViewState(window.location, currentDocUrl, viewState)
      )
    }
  }

  function createNewContentList() {
    ContentTypes.create("contentlist", {}, (contentUrl) => {
      window.location.href = createWebLink(window.location, contentUrl)
    })
  }

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
      <button
        type="button"
        onClick={createNewContentList}
        className="TitleBar-menuItem"
      >
        <i className="fa fa-plus" />
      </button>
      <div className="NavigationBar Inline">
        <button type="button" onClick={goBack} className="TitleBar-menuItem">
          <i className="fa fa-angle-left" />
        </button>

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

        <button
          disabled={forwardDisabled}
          type="button"
          onClick={goForward}
          className="TitleBar-menuItem"
        >
          <i className="fa fa-angle-right" />
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
      <button
        className="BoardTitle__clipboard BoardTitle__labeledIcon TitleBar-menuItem"
        type="button"
        onClick={copyLink}
      >
        <i className="fa fa-clipboard" />
      </button>
      <Omnibox
        active={activeOmnibox}
        documentId={props.documentId}
        omniboxFinished={hideOmnibox}
        onContent={props.onContent}
      />
    </div>
  )
}
