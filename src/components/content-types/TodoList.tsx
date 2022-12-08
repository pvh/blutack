import React, { useCallback } from "react"
import * as ContentTypes from "../pushpin-code/ContentTypes"
import Content, { ContentProps, EditableContentProps } from "../Content"
import { useDocument, useRepo } from "automerge-repo-react-hooks"
import "./TextContent.css"
import { DocHandle, DocumentId } from "automerge-repo"
import {
  createDocumentLink,
  parseDocumentLink,
  PushpinUrl,
} from "../pushpin-code/Url"
import "./TopicList.css"
import ListItem from "../ui/ListItem"
import ContentDragHandle from "../ui/ContentDragHandle"
import Badge from "../ui/Badge"
import TitleWithSubtitle from "../ui/TitleWithSubtitle"
import * as ImportData from "../pushpin-code/ImportData"
import { PdfDoc } from "./files/PdfContent"
import "./TodoList.css"
import ActionListItem from "./workspace/omnibox/ActionListItem"
import Actions from "./workspace/omnibox/Actions"
import Action from "./workspace/omnibox/Action"
import { ContentListItemProps } from "./ContentList"

interface Source {
  url: PushpinUrl
  params: any
}

interface Todo {
  isDone: boolean
  contentUrl: PushpinUrl
  source: Source
}

interface TodoListDoc {
  title: string
  todos: Todo[]
}

interface Props extends ContentProps {
  boardId: DocumentId
}

TodoList.minWidth = 6
TodoList.minHeight = 2
TodoList.defaultWidth = 15

function stopPropagation(e: React.SyntheticEvent) {
  e.stopPropagation()
  e.nativeEvent.stopImmediatePropagation()
}

export default function TodoList({ boardId, documentId, selfId }: Props) {
  const [todoList, changeTodoList] = useDocument<TodoListDoc>(documentId)
  const repo = useRepo()

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()

    ImportData.importDataTransfer(e.dataTransfer, async (url) => {
      const { type, documentId } = parseDocumentLink(url)

      switch (type) {
        case "file": {
          const pdfDoc = await repo.find<PdfDoc>(documentId).value()

          // todo: it's not nice to explicitly create a pdf link here
          const pdfUrl = createDocumentLink("pdf", documentId)

          if (pdfDoc.regions) {
            changeTodoList((todoList) => {
              pdfDoc.regions.forEach((region) => {
                region.annotationUrls.forEach((annotationUrl) => {
                  todoList.todos.push({
                    isDone: false,
                    contentUrl: annotationUrl,
                    source: {
                      url: pdfUrl,
                      params: {
                        region: {
                          page: region.page,
                        },
                      },
                    },
                  })
                })
              })
            })
          }
        }
      }
    })
  }, [])

  const changeTodoIsDoneAt = useCallback(
    (index: number) => {
      changeTodoList((todoList) => {
        todoList.todos[index].isDone = !todoList.todos[index].isDone
      })
    },
    [changeTodoList]
  )

  const deleteTodoAt = useCallback(
    (deletedIndex: number) => {
      changeTodoList((todoList) => {
        todoList.todos.splice(deletedIndex, 1)
      })
    },
    [changeTodoList]
  )

  if (!todoList || !todoList.todos) {
    return null
  }

  return (
    <div
      onDoubleClick={stopPropagation}
      onDragOver={preventDefault}
      onDragEnter={preventDefault}
      onDrop={onDrop}
      className="TodoList"
    >
      <h1 className="TodoList-title">Todos</h1>
      {todoList.todos.map((todo, index) => (
        <div className="TodoList-todo">
          <input
            type="checkbox"
            checked={todo.isDone}
            onChange={() => changeTodoIsDoneAt(index)}
          />

          <div className="TodoList-todoMain">
            <Content
              context="source-link"
              url={todo.source.url}
              {...todo.source.params}
            />

            <div className="TodoList-todoContent">
              <Content url={todo.contentUrl} context="board" key={index} />
            </div>
          </div>

          <div className="TodoList-spacer"></div>

          <div className="TodoList-actions">
            <Action
              callback={(e) => deleteTodoAt(index)}
              faIcon={"fa-trash"}
              label={"Remove"}
              destructive={true}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function preventDefault(e: React.SyntheticEvent) {
  e.preventDefault()
}

export function TodoListInList(props: ContentListItemProps) {
  const { documentId, url, editable, onBlur } = props
  const [doc] = useDocument<TodoListDoc>(documentId)
  if (!doc || !doc.todos) return null

  const title =
    doc.title != null && doc.title !== "" ? doc.title : "Untitled todo list"

  return (
    <ListItem>
      <ContentDragHandle url={url}>
        <Badge size="medium" icon={"list-alt"} />
      </ContentDragHandle>
      <TitleWithSubtitle
        titleEditorField="title"
        title={title}
        documentId={documentId}
        editable={editable}
        onBlur={onBlur}
      />
    </ListItem>
  )
}

function create(unusedAttrs: any, handle: DocHandle<any>) {
  handle.change((doc) => {
    doc.todos = []
  })
}

/*
ContentTypes.register({
  type: "todolist",
  name: "Todo List",
  icon: "list-alt",
  contexts: {
    board: TodoList,
    workspace: TodoList,
    list: TodoListInList,
  },
  create,
})
*/
