import classNames from "classnames"
import React, { ComponentProps, useEffect, useRef, useState } from "react"
import "./Popover.css"

interface PopOverMenuProps extends React.PropsWithChildren {
  trigger: React.ReactElement
  closeOnClick?: boolean
  alignment?: "left" | "right"
}

export function Popover({
  alignment = "left",
  trigger,
  closeOnClick = false,
  children,
}: PopOverMenuProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const listener = (event: TouchEvent | MouseEvent) => {
      // Do nothing if clicking ref's element or descendent elements
      if (
        !ref.current ||
        (event.target && ref.current.contains(event.target as Node))
      ) {
        return
      }

      setIsPopoverOpen(false)
    }

    document.addEventListener("mousedown", listener)
    document.addEventListener("touchstart", listener)
    return () => {
      document.removeEventListener("mousedown", listener)
      document.removeEventListener("touchstart", listener)
    }
  }, [ref])

  function onTogglePopover() {
    setIsPopoverOpen((isOpen) => !isOpen)
  }

  function onClickInside(e: React.MouseEvent) {
    e.stopPropagation()
    e.nativeEvent.stopImmediatePropagation()

    if (closeOnClick) {
      setIsPopoverOpen(false)
    }
  }

  return (
    <div
      className={classNames("Popover", alignment, {
        "is-open": isPopoverOpen,
      })}
    >
      <div onClick={onTogglePopover}>{trigger}</div>
      <div className="ContextMenu" onClick={onClickInside} ref={ref}>
        {children}
      </div>
    </div>
  )
}
