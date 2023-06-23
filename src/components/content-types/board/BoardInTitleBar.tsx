import React from "react"
import { BoardDoc, BoardDocCard, CardId, icon } from "."
import Content, { ContentProps } from "../../../lib/blutack/Content"
import { useDocument } from "automerge-repo-react-hooks"
import { useSelection } from "./BoardSelection"
import Badge from "../../../lib/ui/Badge"
import CardBadge from "./CardBadge"
import ListItem from "../../../lib/ui/ListItem"
import TitleWithSubtitle from "../../../lib/ui/TitleWithSubtitle"
import ContentDragHandle from "../../../lib/ui/ContentDragHandle"

interface Props extends ContentProps {
  editable: boolean
}

type KeyedCard = [CardId, BoardDocCard]

// TODO: maybe i should move this into the title-bar itself?

export default function BoardInTitleBar(props: Props) {
  const { documentId } = props
  const [doc] = useDocument<BoardDoc>(documentId)
  const { selection } = useSelection<CardId>(documentId)

  if (!doc) {
    return null
  }

  return selection.length === 0
    ? Board(props, doc)
    : BoardSelection(props, doc, selectedCards(selection, doc.cards))
}

const selectedCards = <K extends string, V>(
  selection: string[],
  cards: { [id: string]: V }
): [K, V][] =>
  (Object.entries(cards) as [K, V][]).filter(([id]) => selection.includes(id))

const Board = (
  { url, documentId, editable }: Props,
  { title, backgroundColor, cards }: BoardDoc
) => {
  const items = Object.entries(cards)
  const subtitle = `${items.length} item${items.length !== 1 ? "s" : ""}`
  return (
    <ListItem>
      <ContentDragHandle url={url}>
        <Badge icon={icon} backgroundColor={backgroundColor} />
      </ContentDragHandle>
      <TitleWithSubtitle
        title={title}
        subtitle={subtitle}
        documentId={documentId}
        editable={editable}
      />
    </ListItem>
  )
}

export const BoardBadge = (props: Props) => {
  const { documentId, url } = props
  const [doc] = useDocument<BoardDoc>(documentId)

  if (!doc) {
    return null
  }

  return (
    <ContentDragHandle url={url}>
      <Badge icon={icon} backgroundColor={doc.backgroundColor} />
    </ContentDragHandle>
  )
}

const BoardSelection = (
  props: Props,
  doc: BoardDoc,
  selectedCards: KeyedCard[]
) =>
  selectedCards.length === 1
    ? ActiveBoardItem(props, doc, selectedCards[0])
    : SelectedBoardItems(props, doc, selectedCards)

const ActiveBoardItem = (
  { url, documentId, editable }: Props,
  { title, backgroundColor }: BoardDoc,
  [id, card]: KeyedCard
) => {
  return (
    <ListItem>
      <ContentDragHandle url={url}>
        <Badge icon={icon} backgroundColor={backgroundColor} />
      </ContentDragHandle>
      <div className="ActiveCard">
        <ListItem>
          <Content url={url} context="badge" />
          <Content url={url} context="title" editable />
        </ListItem>
      </div>
    </ListItem>
  )
}

const SelectedBoardItems = (
  { url, documentId, editable, context }: Props,
  { title, backgroundColor }: BoardDoc,
  selectedCards: KeyedCard[]
) => {
  const subtitle = `${selectedCards.length} items selected`
  return (
    <ListItem>
      <ContentDragHandle url={url}>
        <Badge icon={icon} backgroundColor={backgroundColor} />
      </ContentDragHandle>
      <div className="BoardSelection">
        {selectedCards.map(([id, card]) => (
          <div className="ActiveCard" key={id}>
            <CardBadge url={card.url} context={context} />
          </div>
        ))}
      </div>
      <TitleWithSubtitle
        title={title}
        subtitle={subtitle}
        documentId={documentId}
        editable={editable}
      />
    </ListItem>
  )
}
