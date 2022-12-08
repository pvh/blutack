import classNames from "classnames"
import React, {
  ComponentProps,
  SyntheticEvent,
  useEffect,
  useRef,
  useState,
} from "react"
import "./Popover.css"
import { usePopper } from "react-popper"
import { Placement, Boundary } from "@popperjs/core"

interface PopOverMenuProps extends React.PropsWithChildren {
  trigger: React.ReactElement
  closeOnClick?: boolean
  placement?: Placement
  distance?: number // add a gap between the trigger and the popover
  skidding?: number // shift the popover relative to the trigger
}

export function Popover({
  trigger,
  closeOnClick = false,
  children,
  placement = "auto",
  distance = 5,
  skidding = 0,
}: PopOverMenuProps) {
  const [referenceElement, setReferenceElement] =
    useState<HTMLDivElement | null>(null)
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(
    null
  )
  const { styles } = usePopper(referenceElement, popperElement, {
    placement,
    strategy: "fixed",
    modifiers: [
      {
        name: "offset",
        options: {
          offset: [skidding, distance],
        },
      },
      {
        name: "preventOverflow",
        options: { boundary: document.body },
      },
      {
        name: "flip",
        options: { boundary: document.body },
      },
    ],
  })

  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!popperElement) {
      return
    }

    const listener = (event: TouchEvent | MouseEvent) => {
      // Do nothing if clicking ref's element or descendent elements

      if (
        !isPopoverOpen ||
        (event.target && popperElement.contains(event.target as Node))
      ) {
        return
      }

      setIsPopoverOpen(false)
    }

    document.addEventListener("click", listener, true)
    return () => {
      document.removeEventListener("click", listener, true)
    }
  }, [ref, isPopoverOpen, popperElement])

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
    <>
      <div ref={setReferenceElement} onClick={onClickTrigger}>
        {trigger}
      </div>
      {isPopoverOpen && (
        <div
          ref={setPopperElement}
          className="ContextMenu"
          onClick={onClickInside}
          style={styles.popper}
        >
          {children}
        </div>
      )}
    </>
  )
}
