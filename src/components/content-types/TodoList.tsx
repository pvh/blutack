import React, { useCallback } from "react"
import * as ContentTypes from "../pushpin-code/ContentTypes"
import Content, { ContentProps, EditableContentProps } from "../Content"
import { useDocument, useRepo } from "automerge-repo-react-hooks"
import "./TextContent.css"
import { DocHandle, DocumentId } from "automerge-repo"
import { parseDocumentLink, PushpinUrl } from "../pushpin-code/ShareLink"
import "./TopicList.css"
import ListItem from "../ui/ListItem"
import ContentDragHandle from "../ui/ContentDragHandle"
import Badge from "../ui/Badge"
import TitleWithSubtitle from "../ui/TitleWithSubtitle"
import * as ImportData from "../pushpin-code/ImportData"
import { PdfDoc } from "./files/PdfContent"
import "./TodoList.css"

interface Todo {
  isDone: boolean
  contentUrl: PushpinUrl

  // todo: add source to todos
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

          if (pdfDoc.regions) {
            changeTodoList((todoList) => {
              pdfDoc.regions.forEach((region) => {
                region.annotationUrls.forEach((annotationUrl) => {
                  todoList.todos.push({
                    isDone: false,
                    contentUrl: annotationUrl,
                  })
                })
              })
            })
          }
        }
      }
    })
  }, [])

  const changeIsDoneAt = useCallback((index: number) => {
    changeTodoList((todoList) => {
      todoList.todos[index].isDone = !todoList.todos[index].isDone
    })
  }, [])

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
          <input type="checkbox" onChange={() => changeIsDoneAt(index)} />

          <div className="TodoList-todoContent">
            <Content url={todo.contentUrl} context="board" key={index} />
          </div>
        </div>
      ))}
    </div>
  )
}

function preventDefault(e: React.SyntheticEvent) {
  e.preventDefault()
}

export function TodoListInList(props: EditableContentProps) {
  const { documentId, url, editable } = props
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
      />
    </ListItem>
  )
}

function create(unusedAttrs: any, handle: DocHandle<any>) {
  handle.change((doc) => {
    doc.todos = []
  })
}

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
