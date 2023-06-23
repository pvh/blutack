import React from "react"

import { ContentProps } from "../../../lib/blutack/Content"
import { BoardDoc, icon } from "."
import { useDocument } from "automerge-repo-react-hooks"
import "./BoardInBoard.css"
import Badge from "../../../lib/ui/Badge"
import SecondaryText from "../../../lib/ui/SecondaryText"
import Heading from "../../../lib/ui/Heading"
import CenteredStack from "../../../lib/ui/CenteredStack"

BoardInBoard.minWidth = 5
BoardInBoard.minHeight = 6
BoardInBoard.defaultWidth = 6
BoardInBoard.maxWidth = 9
BoardInBoard.maxHeight = 10

export default function BoardInBoard(props: ContentProps) {
  const { documentId } = props
  const [doc] = useDocument<BoardDoc>(documentId)

  if (!doc) {
    return null
  }

  const { title, backgroundColor, cards } = doc

  const childCardCount = Object.keys(cards || {}).length
  const subTitle = `${childCardCount} card${childCardCount === 1 ? "" : "s"}`

  return (
    <CenteredStack>
      <Badge size="huge" icon={icon} backgroundColor={backgroundColor} />
      <Heading wrap>{title}</Heading>
      <SecondaryText>{subTitle}</SecondaryText>
    </CenteredStack>
  )
}
