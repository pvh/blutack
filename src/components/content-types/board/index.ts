import { DocumentId, DocHandle } from "automerge-repo"
import { ContentType } from "../../../lib/blutack/ContentTypes"
import { PushpinUrl } from "../../../lib/blutack/Url"

// board in various contexts
import Board, { BOARD_COLORS } from "./Board"
import BoardInBoard from "./BoardInBoard"
import { List } from "@automerge/automerge"

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
  return BOARD_COLOR_VALUES[Math.floor(Math.random() * BOARD_COLOR_VALUES.length)]
}

function initializeBoard(
  { title = "No Title", backgroundColor = randomColor() }: Attrs,
  handle: DocHandle<BoardDoc>
) {
  handle.change((board) => {
    board.title = title
    board.backgroundColor = backgroundColor
    board.cards = {}
    board.authorIds = [] as unknown as List<DocumentId>
  })
}

function create(typeAttrs: Attrs, handle: DocHandle<unknown>) {
  initializeBoard(typeAttrs, handle as DocHandle<BoardDoc>)
}

export const icon = "sitemap"

export const contentType: ContentType = {
  type: "board",
  contexts: {
    expanded: Board,
    board: BoardInBoard,
  },
  name: "Board",
  icon,
  create,
}
