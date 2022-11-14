import classNames from "classnames"
import React, {
  ComponentProps,
  SyntheticEvent,
  useEffect,
  useRef,
  useState,
} from "react"
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

    document.addEventListener("click", listener, true)
    return () => {
      document.removeEventListener("click", listener, true)
    }
  }, [ref])

  function onClickTrigger(e: SyntheticEvent) {
    e.stopPropagation()
    e.nativeEvent.stopImmediatePropagation()

    setIsPopoverOpen((isOpen) => !isOpen)
  }

  function onClickInside(e: SyntheticEvent) {
    e.stopPropagation()
    e.nativeEvent.stopImmediatePropagation()

    if (closeOnClick) {
      setIsPopoverOpen(false)
    }
  }

  return (
    <div
      ref={ref}
      className={classNames("Popover", alignment, {
        "is-open": isPopoverOpen,
      })}
    >
      <div onClick={onClickTrigger}>{trigger}</div>
      <div className="ContextMenu" onClick={onClickInside}>
        {children}
      </div>
    </div>
  )
}
