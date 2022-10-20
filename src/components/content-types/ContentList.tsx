import React, {
  useContext,
  useRef,
  Ref,
  ChangeEvent,
  useState,
  useMemo,
  useCallback,
} from "react"

import { PushpinUrl } from "../pushpin-code/ShareLink"

import Content, { ContentProps, EditableContentProps } from "../Content"
import * as ContentTypes from "../pushpin-code/ContentTypes"

import { DocHandle, DocumentId } from "automerge-repo"
import { useDocument } from "automerge-repo-react-hooks"

import CenteredStack from "../ui/CenteredStack"
import ListMenuItem from "../ui/ListMenuItem"
import ListMenu from "../ui/ListMenu"
import "./ContentList.css"
import DefaultInList from "./defaults/DefaultInList"
import ListMenuHeader from "../ui/ListMenuHeader"
import TitleEditor from "../TitleEditor"
import ListItem from "../ui/ListItem"
import ListMenuSection from "../ui/ListMenuSection"
import classNames from "classnames"
import ActionListItem from "./workspace/omnibox/ActionListItem"
import CenteredStackRowItem from "../ui/CenteredStackRowItem"
import ContentDragHandle from "../ui/ContentDragHandle"
import Badge from "../ui/Badge"
import TitleWithSubtitle from "../ui/TitleWithSubtitle"
import { MIMETYPE_CONTENT_LIST_INDEX } from "../constants"
import * as ImportData from "../pushpin-code/ImportData"
import Heading from "../ui/Heading"

export interface ContentListDoc {
  title: string
  content: PushpinUrl[]
}

ContentList.minWidth = 24
ContentList.minHeight = 8
ContentList.defaultWidth = 24
ContentList.maxWidth = 80
ContentList.maxHeight = 36

export default function ContentList({ documentId }: ContentProps) {
  const [doc, changeDoc] = useDocument<ContentListDoc>(documentId)
  const [currentContent, selectContent] = useState<PushpinUrl | undefined>()
  const [addingNewItem, setAddingNewItem] = useState(false)
  const contentTypes = useMemo(
    () => ContentTypes.list({ context: "board" }),
    []
  )
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | undefined>()

  const onDragOver = useCallback((e: React.DragEvent, index: number) => {
    const element = e.target as Element
    const percentage =
      (e.clientY - element.getBoundingClientRect().top) / element.clientHeight

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

      const deleteIndex = parseInt(
        e.dataTransfer.getData(MIMETYPE_CONTENT_LIST_INDEX),
        10
      )
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

  const hiddenFileInput = useRef<HTMLInputElement>(null)

  if (!doc || !doc.content) {
    return null
  }

  if (!currentContent && doc.content.length > 0) {
    selectContent(doc.content[0])
  }

  const { content } = doc

  const addContent = (contentType: ContentTypes.LookupResult) => {
    ContentTypes.create(contentType.type, {}, (contentUrl) => {
      changeDoc((doc) => {
        doc.content.push(contentUrl)
      })
    })
  }

  const removeContent = (url: PushpinUrl) => {
    changeDoc((doc) => {
      const index = doc.content.findIndex((v) => v === url)
      if (index > 0) {
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
      keysForActionPressed: (e: KeyboardEvent) =>
        !e.shiftKey && e.key === "Enter",
      callback: (url: PushpinUrl) => () => selectContent(url),
    },
    {
      name: "remove",
      destructive: true,
      callback: (url: PushpinUrl) => () => removeContent(url),
      faIcon: "fa-trash",
      label: "Remove",
      shortcut: "⌘+⌫",
      keysForActionPressed: (e: KeyboardEvent) =>
        (e.metaKey || e.ctrlKey) && e.key === "Backspace",
    },
  ]

  const onImportClick = () => {
    if (hiddenFileInput.current) {
      hiddenFileInput.current.click()
    }
  }
  const onFilesChanged = (e: any) => {
    ImportData.importFileList(e.target.files, (url, i) => {
      changeDoc((doc) => {
        doc.content.push(url)
      })
    })
  }

  return (
    <CenteredStack direction="row" centerText={false}>
      <CenteredStackRowItem
        size={{ mode: "fixed", width: "250px" }}
        style={{ borderRight: "solid thin #ddd" }}
      >
        <ListMenu>
          {content.map((url, index) => (
            <div
              className={classNames({
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
                <Content context="list" url={url} editable={true} />
              </ActionListItem>
            </div>
          ))}
          <div
            className={classNames({
              "ContentListItem--insertTop": draggedOverIndex === content.length,
            })}
          />
          <ListMenuItem onClick={() => setAddingNewItem((prev) => !prev)}>
            + Create new item
          </ListMenuItem>
          {addingNewItem && (
            <ListMenuSection>
              {contentTypes.map((contentType) => (
                <ListMenuItem
                  onClick={() => {
                    addContent(contentType)
                    setAddingNewItem(false)
                  }}
                  key={contentType.type}
                >
                  <div className="ContextMenu__iconBounding ContextMenu__iconBounding--note">
                    <i className={classNames("fa", `fa-${contentType.icon}`)} />
                  </div>
                  <span className="ContextMenu__label">{contentType.name}</span>
                </ListMenuItem>
              ))}
            </ListMenuSection>
          )}
          <ListMenuItem key="import" onClick={onImportClick}>
            <input
              type="file"
              id="hiddender"
              multiple
              onChange={onFilesChanged}
              ref={hiddenFileInput}
              style={{ display: "none" }}
            />
            <Heading>Import file...</Heading>
          </ListMenuItem>
        </ListMenu>
      </CenteredStackRowItem>
      <CenteredStackRowItem size={{ mode: "auto" }}>
        {currentContent ? (
          <Content context="workspace" url={currentContent} />
        ) : (
          <div style={{ padding: "10px" }}>Select something from the side</div>
        )}
      </CenteredStackRowItem>
    </CenteredStack>
  )
}

const icon = "list"

export function ContentListInList(props: EditableContentProps) {
  const { documentId, url, editable } = props
  const [doc] = useDocument<ContentListDoc>(documentId)
  if (!doc || !doc.content) return null

  const title =
    doc.title != null && doc.title !== "" ? doc.title : "Untitled List"
  const items = doc.content.length
  const subtitle = `${items} item${items !== 1 ? "s" : ""}`

  return (
    <ListItem>
      <ContentDragHandle url={url}>
        <Badge size="medium" icon={icon} />
      </ContentDragHandle>
      <TitleWithSubtitle
        titleEditorField="title"
        title={title}
        subtitle={subtitle}
        documentId={documentId}
        editable={editable}
      />
    </ListItem>
  )
}

function create(attrs: any, handle: DocHandle<any>) {
  handle.change((doc: ContentListDoc) => {
    if (attrs.title) {
      doc.title = attrs.title
    }

    doc.content = []
  })
}

ContentTypes.register({
  type: "contentlist",
  name: "List",
  icon: "sticky-note",
  contexts: {
    root: ContentList,
    board: ContentList,
    workspace: ContentList,
    list: ContentListInList,
    "title-bar": ContentListInList,
  },
  create,
})
