import classNames from "classnames"
import React from "react"
import "./CenteredStackRowItem.css"

// TODO: width is only for rows; need height for vstacks
export interface Props {
  /** The size of this item: either auto-grow/shrink, or fixed width */
  size: { mode: "auto" } | { mode: "fixed"; width: string }
  style?: React.CSSProperties
  className?: string
  children: React.ReactNode
}

export default function CenteredStackRowItem({
  className,
  size,
  style,
  children,
}: Props) {
  const finalStyle = style || {}
  if (size.mode === "fixed") {
    finalStyle.width = size.width
  }
  return (
    <div
      className={classNames(
        "CenteredStackRowItem",
        className,
        size.mode === "auto" && "CenteredStackRowItem--auto",
        size.mode === "fixed" && "CenteredStackRowItem--fixed"
      )}
      style={finalStyle}
    >
      {children}
    </div>
  )
}
