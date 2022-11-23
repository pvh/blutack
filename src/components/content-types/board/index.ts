import { DocumentId, DocHandle } from "automerge-repo"
import * as ContentTypes from "../../pushpin-code/ContentTypes"
import { PushpinUrl } from "../../pushpin-code/Url"

// board in various contexts
import Board, { BOARD_COLORS } from "./Board"
import BoardInBoard from "./BoardInBoard"
import BoardInList from "./BoardInList"
import BoardInTitleBar from "./BoardInTitleBar"

export type CardId = string & { cardId: true }

export interface BoardDocCard {
  url: PushpinUrl
  x: number
  y: number
  height?: number
  width?: number
}

export interface BoardDoc {
  title: string
  backgroundColor: string
  cards: { [id: string]: BoardDocCard }
  documentId: DocumentId // added by workspace
  authorIds: DocumentId[]
}

interface Attrs {
  title?: string
  backgroundColor?: string
}

const BOARD_COLOR_VALUES = Object.values(BOARD_COLORS)

function randomColor(): string {
  return BOARD_COLOR_VALUES[
    Math.floor(Math.random() * BOARD_COLOR_VALUES.length)
  ]
}

function initializeBoard(
  { title = "No Title", backgroundColor = randomColor() }: Attrs,
  handle: DocHandle<BoardDoc>
) {
  handle.change((board) => {
    board.title = title
    board.backgroundColor = backgroundColor
    board.cards = {}
    board.authorIds = []
  })
}

function create(typeAttrs: Attrs, handle: DocHandle<unknown>) {
  initializeBoard(typeAttrs, handle as DocHandle<BoardDoc>)
}

export const icon = "sitemap"

ContentTypes.register({
  type: "board",
  contexts: {
    workspace: Board,
    board: BoardInBoard,
    list: BoardInList,
    "title-bar": BoardInTitleBar,
  },
  name: "Board",
  icon,
  create,
})
