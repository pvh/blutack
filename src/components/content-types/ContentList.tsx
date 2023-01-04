import React, { useState, useCallback } from "react"

import { createDocumentLink, parseDocumentLink, PushpinUrl } from "../pushpin-code/Url"

import Content, { ContentProps } from "../Content"

import { DocHandle } from "automerge-repo"
import { useDocument } from "automerge-repo-react-hooks"

import CenteredStack from "../ui/CenteredStack"
import ListMenu from "../ui/ListMenu"
import "./ContentList.css"
import ListItem from "../ui/ListItem"
import classNames from "classnames"
import ActionListItem from "./workspace/omnibox/ActionListItem"
import CenteredStackRowItem from "../ui/CenteredStackRowItem"
import { MIMETYPE_CONTENT_LIST_INDEX } from "../constants"
import * as ImportData from "../pushpin-code/ImportData"
import { useViewState } from "../pushpin-code/ViewState"
import NewDocumentButton from "../NewDocumentButton"
import { openDoc } from "../pushpin-code/Url"
import { ContentType } from "../pushpin-code/ContentTypes"

export interface ContentListDoc {
  title: string
  content: PushpinUrl[]
}

ContentList.minWidth = 24
ContentList.minHeight = 8
ContentList.defaultWidth = 24
ContentList.maxWidth = 80
ContentList.maxHeight = 36

function getListMenuItemElement(element: HTMLElement | null): HTMLElement | null {
  if (!element) {
    return null
  }

  if (element.classList.contains("ContentListItem")) {
    return element
  }

  return getListMenuItemElement(element.parentElement)
}

export default function ContentList({ documentId }: ContentProps) {
  const [doc, changeDoc] = useDocument<ContentListDoc>(documentId)

  const [currentContent, setCurrentContent] = useViewState<PushpinUrl | undefined>(
    documentId,
    "currentContent"
  )

  const [draggedOverIndex, setDraggedOverIndex] = useState<number | undefined>()

  const onDragOver = useCallback((e: React.DragEvent, index: number) => {
    const element = getListMenuItemElement(e.target as HTMLElement)

    if (!element) {
      return
    }

    const percentage = (e.clientY - element.getBoundingClientRect().top) / element.clientHeight

    setDraggedOverIndex(percentage > 0.5 ? index + 1 : index)

    e.preventDefault()
    e.stopPropagation()
  }, [])

  const onDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.setData(MIMETYPE_CONTENT_LIST_INDEX, index.toString())
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent, index: number) => {
    setDraggedOverIndex(undefined)
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      if (draggedOverIndex === undefined) {
        return
      }

      e.preventDefault()
      e.stopPropagation()

      const deleteIndex = parseInt(e.dataTransfer.getData(MIMETYPE_CONTENT_LIST_INDEX), 10)
      const insertIndex = Math.max(
        0,
        !isNaN(deleteIndex) && deleteIndex < draggedOverIndex
          ? draggedOverIndex - 1
          : draggedOverIndex
      )

      setDraggedOverIndex(undefined)

      if (!isNaN(deleteIndex)) {
        changeDoc((doc) => {
          doc?.content.splice(deleteIndex, 1)
        })
      }

      ImportData.importDataTransfer(e.dataTransfer, (url) => {
        changeDoc((doc) => {
          doc.content.splice(insertIndex, 0, url)
        })
      })
    },
    [draggedOverIndex]
  )

  function selectContent(contentUrl: PushpinUrl) {
    if (parseDocumentLink(contentUrl).type === "contentlist") {
      openDoc(contentUrl)
    } else {
      setCurrentContent(contentUrl)
    }
  }

  const onCreateContent = useCallback(
    (contentUrl: PushpinUrl) => {
      changeDoc((doc) => {
        doc.content.push(contentUrl)
        selectContent(contentUrl)
      })
    },
    [changeDoc]
  )

  if (!doc || !doc.content) {
    return null
  }

  const { content } = doc

  const removeContent = (url: PushpinUrl) => {
    if (currentContent === url) {
      setCurrentContent(undefined)
    }
    changeDoc((doc) => {
      const index = doc.content.findIndex((v) => v === url)
      if (index >= 0) {
        doc.content.splice(index, 1)
      }
    })
  }

  // XXX: Would be better to not recreate this every render.
  const actions = [
    {
      name: "view",
      faIcon: "fa-compass",
      label: "View",
      shortcut: "⏎",
      keysForActionPressed: (e: KeyboardEvent) => !e.shiftKey && e.key === "Enter",
      callback: (url: PushpinUrl) => () => setCurrentContent(url),
    },
    {
      name: "debug",
      faIcon: "fa-bug",
      label: "Debug",
      shortcut: "⌘+d",
      keysForActionPressed: (e: KeyboardEvent) => (e.metaKey || e.ctrlKey) && e.key === "d",
      callback: (url: PushpinUrl) => () =>
        openDoc(createDocumentLink("raw", parseDocumentLink(url).documentId)),
    },
    {
      name: "remove",
      destructive: true,
      callback: (url: PushpinUrl) => () => removeContent(url),
      faIcon: "fa-trash",
      label: "Remove",
      shortcut: "⌘+⌫",
      keysForActionPressed: (e: KeyboardEvent) => (e.metaKey || e.ctrlKey) && e.key === "Backspace",
    },
  ]

  return (
    <CenteredStack direction="row" centerText={false}>
      <CenteredStackRowItem
        size={{ mode: "fixed", width: "250px" }}
        style={{
          borderRight: "solid thin #ddd",
          overflow: "auto",
        }}
      >
        <ListMenu>
          {content.map((url, index) => (
            <div
              className={classNames("ContentListItem", {
                "ContentListItem--insertTop": draggedOverIndex === index,
              })}
              onDragStart={(evt) => onDragStart(evt, index)}
              onDragOver={(evt) => onDragOver(evt, index)}
              onDragEnter={(evt) => onDragOver(evt, index)}
              onDragLeave={(evt) => onDragLeave(evt, index)}
              onDrop={(evt) => onDrop(evt)}
              key={url}
            >
              <ActionListItem
                contentUrl={url}
                defaultAction={actions[0]}
                actions={actions}
                selected={url === currentContent}
              >
                <ListItem>
                  <Content url={url} context="badge" />
                  <Content url={url} context="title" />
                </ListItem>
              </ActionListItem>
            </div>
          ))}
          <div
            className={classNames("ContentListItem", {
              "ContentListItem--insertTop": draggedOverIndex === content.length,
            })}
          />

          <NewDocumentButton
            trigger={
              <div className="ContentList--newItem">
                <span className="ContentList--newItem-icon fa fa-plus"></span>
                New Item
              </div>
            }
            onCreateDocument={onCreateContent}
          />
        </ListMenu>
      </CenteredStackRowItem>
      <CenteredStackRowItem size={{ mode: "auto" }} className="ContentList--main">
        {currentContent ? (
          <Content context="expanded" url={currentContent} />
        ) : (
          <div style={{ padding: "10px" }}>Select something from the side</div>
        )}
      </CenteredStackRowItem>
    </CenteredStack>
  )
}

const icon = "list"

function create(attrs: any, handle: DocHandle<any>) {
  handle.change((doc: ContentListDoc) => {
    if (attrs.title) {
      doc.title = attrs.title
    }

    doc.content = []
  })
}

export const contentType: ContentType = {
  type: "contentlist",
  name: "List",
  icon,
  contexts: {
    root: ContentList,
    board: ContentList,
    expanded: ContentList,
  },
  create,
}
