import { createDocumentLink, openDoc, parseDocumentLink } from "../components/pushpin-code/Url"

import CenteredStack from "../components/ui/CenteredStack"
import ListMenu from "../components/ui/ListMenu"
import classNames from "classnames"
import { MIMETYPE_CONTENT_LIST_INDEX } from "../components/constants"
import * as ImportData from "../components/pushpin-code/ImportData"
import { useDocument } from "automerge-repo-react-hooks"
import ActionListItem from "../components/content-types/workspace/omnibox/ActionListItem"
import TitleWithSubtitle from "../components/ui/TitleWithSubtitle"
import React, {useMemo, useRef} from "react"
import * as ContentTypes from "../components/pushpin-code/ContentTypes";
import {Popover} from "../components/ui/Popover";
import ListMenuSection from "../components/ui/ListMenuSection";
import ListMenuItem from "../components/ui/ListMenuItem";

function getListMenuItemElement(element) {
  if (!element) {
    return null
  }

  if (element.classList.contains("ContentListItem")) {
    return element
  }

  return getListMenuItemElement(element.parentElement)
}

export default function ContentList({ documentId }) {
  const [doc, changeDoc] = useDocument(documentId)
  const [draggedOverIndex, setDraggedOverIndex] = React.useState()

  const onDragOver = React.useCallback((e, index) => {
    const element = getListMenuItemElement(e.target)

    if (!element) {
      return
    }

    const percentage = (e.clientY - element.getBoundingClientRect().top) / element.clientHeight

    setDraggedOverIndex(percentage > 0.5 ? index + 1 : index)

    e.preventDefault()
    e.stopPropagation()
  }, [])

  const onDragStart = React.useCallback((e, index) => {
    e.dataTransfer.setData(MIMETYPE_CONTENT_LIST_INDEX, index.toString())
  }, [])

  const onDragLeave = React.useCallback((e, index) => {
    setDraggedOverIndex(undefined)
  }, [])

  const onDrop = React.useCallback(
    (e) => {
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

  function selectContent(contentUrl) {
    if (parseDocumentLink(contentUrl).type === "contentlist") {
      openDoc(contentUrl)
    } else {
      setCurrentContent(contentUrl)
    }
  }

  const onCreateContent = React.useCallback(
    (contentUrl) => {
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

  const removeContentAt = (index) => {
    changeDoc((doc) => {
      doc.content.splice(index, 1)
    })
  }

  // XXX: Would be better to not recreate this every render.

  return (
    <CenteredStack direction="row" centerText={false}>
      <ListMenu>
        {content.map((url, index) => {
          return (
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
              <ContentListItem url={url} onDelete={() => removeContentAt(index)} />
            </div>
          )
        })}
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
    </CenteredStack>
  )
}

function ContentListItem({ url, onDelete }) {
  const actions = [
    {
      name: "view",
      faIcon: "fa-compass",
      label: "View",
      shortcut: "⏎",
      keysForActionPressed: (e) => !e.shiftKey && e.key === "Enter",
      callback: (url) => () => {
        console.log("not implemented")
      },
    },
    {
      name: "debug",
      faIcon: "fa-bug",
      label: "Debug",
      shortcut: "⌘+d",
      keysForActionPressed: (e) => (e.metaKey || e.ctrlKey) && e.key === "d",
      callback: (url) => () =>
        openDoc(createDocumentLink("raw", parseDocumentLink(url).documentId)),
    },
    {
      name: "remove",
      destructive: true,
      callback: (url) => () => onDelete(),
      faIcon: "fa-trash",
      label: "Remove",
      shortcut: "⌘+⌫",
      keysForActionPressed: (e) => (e.metaKey || e.ctrlKey) && e.key === "Backspace",
    },
  ]

  const { type, documentId } = parseDocumentLink(url)
  const [doc] = useDocument(documentId)

  if (!doc) {
    return null
  }

  return (
    <ActionListItem contentUrl={url} defaultAction={actions[0]} actions={actions}>
      <TitleWithSubtitle
        title={doc.title ?? `Untitled ${type}`}
        titleEditorField={"title"}
        documentId={documentId}
        editable={true}
      />
    </ActionListItem>
  )
}

export function NewDocumentButton({ trigger, onCreateDocument }) {
  const hiddenFileInput = useRef(null)

  const contentTypes = useMemo(
    () => ContentTypes.list({ context: "board" }),
    []
  )

  const createDoc = contentType => {
    ContentTypes.create(contentType.type, {}, contentUrl => {
      onCreateDocument(contentUrl)
    })
  }

  const onImportClick = () => {
    if (hiddenFileInput.current) {
      hiddenFileInput.current.click()
    }
  }
  const onFilesChanged = e => {
    ImportData.importFileList(e.target.files, url => {
      onCreateDocument(url)
    })
  }

  return (
    <Popover closeOnClick={true} trigger={trigger}>
      <ListMenuSection>
        {contentTypes.map(contentType => (
          <ListMenuItem
            onClick={() => {
              createDoc(contentType)
            }}
            key={contentType.type}
          >
            <div className="ContextMenu__iconBounding ContextMenu__iconBounding--note">
              <i className={classNames("fa", `fa-${contentType.icon}`)} />
            </div>
            <span className="ContextMenu__label">{contentType.name}</span>
          </ListMenuItem>
        ))}

        <ListMenuItem key="import" onClick={onImportClick}>
          <div>
            <input
              type="file"
              id="hiddender"
              multiple
              onChange={onFilesChanged}
              ref={hiddenFileInput}
              style={{ display: "none" }}
            />
            <div className="ContextMenu__iconBounding ContextMenu__iconBounding--note">
              <i className="fa fa-file-o" />
            </div>
          </div>
          <span className="ContextMenu__label">File</span>
        </ListMenuItem>
      </ListMenuSection>
    </Popover>
  )
}


function create(attrs, handle) {
  handle.change((doc) => {
    if (attrs.title) {
      doc.title = attrs.title
    }

    doc.content = []
  })
}

export const contentType = {
  type: "contentlist",
  name: "List",
  icon: "list",
  contexts: {
    root: ContentList,
    board: ContentList,
    expanded: ContentList,
  },
  create,
}
