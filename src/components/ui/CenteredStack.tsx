import React from "react"
import "./CenteredStack.css"
import classNames from "classnames"

type Row = "row"
type Column = "column"
type Direction = Row | Column

type Start = 'start'
type Center = 'center'
type End = 'end'
type Alignment = Start | Center | End
export interface Props {
  direction?: Direction
  align?: Alignment
  centerText?: boolean
  style?: React.CSSProperties
  children: React.ReactNode
}

export default function CenteredStack({
<<<<<<< HEAD
  direction = "column",
=======
  direction = 'column',
  align = 'center',
>>>>>>> 3da0889 (wip)
  centerText = true,
  style,
  children,
}: Props) {
  return (
    <span
      className={classNames([
        "CenteredStack",
        `CenteredStack--${direction}`,
<<<<<<< HEAD
        centerText && "CenteredStack--centerText",
=======
        `CenteredStack--${align}`,
        centerText && 'CenteredStack--centerText',
>>>>>>> 3da0889 (wip)
      ])}
      style={style}
    >
      {children}
    </span>
  )
}
