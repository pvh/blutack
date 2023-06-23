import classNames from "classnames"
import {
  MIMETYPE_CONTENT_LIST_INDEX,
  ImportData,
  ContentTypes,
  useDocument,
  Url
} from "../lib/blutack"
import {
  Badge,
  CenteredStack,
  ListItem,
  ListMenu,
  ListMenuItem,
  ListMenuSection,
  Popover,
  TitleWithSubtitle,
  ActionListItem
} from "../lib/ui"
/*
const {
  MIMETYPE_CONTENT_LIST_INDEX,
  ImportData,
  ContentTypes,
  useDocument,
  Url
} = Blutack
const {
  Badge,
  CenteredStack,
  ListItem,
  ListMenu,
  ListMenuItem,
  ListMenuSection,
  Popover,
  TitleWithSubtitle,
  ActionListItem
} = Ui
*/

//const { useMemo, useState, useCallback } = React
import { useMemo, useState, useCallback } from "react"
import {useRepo} from "automerge-repo-react-hooks";
import {createDocumentLink} from "../lib/blutack/Url";

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
  const [draggedOverIndex, setDraggedOverIndex] = useState()

  const onDragOver = useCallback((e, index) => {
    const element = getListMenuItemElement(e.target)

    if (!element) {
      return
    }

    const percentage = (e.clientY - element.getBoundingClientRect().top) / element.clientHeight

    setDraggedOverIndex(percentage > 0.5 ? index + 1 : index)

    e.preventDefault()
    e.stopPropagation()
  }, [])

  const onDragStart = useCallback((e, index) => {
    e.dataTransfer.setData(MIMETYPE_CONTENT_LIST_INDEX, index.toString())
  }, [])

  const onDragLeave = useCallback((e, index) => {
    setDraggedOverIndex(undefined)
  }, [])

  const onDrop = useCallback(
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

  const onCreateContent = useCallback(
    (contentUrl) => {
      changeDoc((doc) => {
        doc.content.push(contentUrl)
        Url.openDocument(contentUrl)
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
        Url.openDocument(url)
      },
    },
    {
      name: "debug",
      faIcon: "fa-bug",
      label: "Debug",
      shortcut: "⌘+d",
      keysForActionPressed: (e) => (e.metaKey || e.ctrlKey) && e.key === "d",
      callback: (url) => () =>
        Url.openDocument(Url.createDocumentLink("raw", Url.parseDocumentLink(url).documentId)),
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

  const { type, documentId } = Url.parseDocumentLink(url)
  const [doc] = useDocument(documentId)

  const contentType = ContentTypes.typeNameToContentType(type)

  if (!doc) {
    return null
  }

  return (
    <ActionListItem contentUrl={url} defaultAction={actions[0]} actions={actions}>
      <ListItem>
        <Badge icon={contentType ? contentType.icon : "question"} />
        <TitleWithSubtitle
          title={doc.title ?? `Untitled ${type}`}
          titleEditorField={"title"}
          documentId={documentId}
          editable={true}
        />
      </ListItem>
    </ActionListItem>
  )
}

export function NewDocumentButton({ trigger, onCreateDocument }) {
  const contentTypes = useMemo(() => ContentTypes.list({ context: "board" }), [])
  const repo = useRepo()

  const createDoc = (contentType) => {
    ContentTypes.create(contentType.type, {}, (contentUrl) => {
      onCreateDocument(contentUrl)
    })
  }

  const createBlancDoc = () => {
    const handle = repo.create()

    handle.change((doc) => {
      doc.source = ""

      onCreateDocument(createDocumentLink("editor", handle.documentId))
    })
  }

  return (
    <Popover closeOnClick={true} trigger={trigger}>
      <ListMenuSection>
        {contentTypes.map((contentType) => (
          <ListMenuItem
            onClick={() => {
              createDoc(contentType)
            }}
            key={contentType.type}
          >
            <Badge icon={contentType ? contentType.icon : "question"} />
            <span className="ContextMenu__label">{contentType.name}</span>
          </ListMenuItem>
        ))}
        {<ListMenuItem
          onClick={() => createBlancDoc()}
        >
          <Badge icon={"question"} />
          <span className="ContextMenu__label">Blank Document</span>
        </ListMenuItem>}
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
