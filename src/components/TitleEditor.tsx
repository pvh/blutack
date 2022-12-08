import { DocumentId } from "automerge-repo"
import { useDocument } from "automerge-repo-react-hooks"

import React, {
  MutableRefObject,
  Ref,
  RefCallback,
  useCallback,
  useRef,
} from "react"

import "./TitleEditor.css"

interface AnyDoc {
  [field: string]: string
}

interface Props {
  documentId: DocumentId
  field?: string
  placeholder?: string
  preventDrag?: boolean
  onBlur?: () => void
  autoselect?: boolean
}

// `preventDrag` is a little kludgey, but is required to enable text selection if the
// input is in a draggable element.
export default function TitleEditor(props: Props) {
  const [doc, changeDoc] = useDocument<AnyDoc>(props.documentId)
  const input: MutableRefObject<HTMLInputElement | null> = useRef(null)
  const {
    field = "title",
    preventDrag = false,
    placeholder = "",
    onBlur,
  } = props

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === "Escape") {
      input.current && input.current.blur()
    }
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    changeDoc((doc: AnyDoc) => {
      doc[field] = e.target.value
    })
  }

  // Required to prevent draggable parent elements from blowing away edit capability.
  function onDragStart(e: React.DragEvent) {
    if (preventDrag) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  const onRef = useCallback(
    (element: HTMLInputElement) => {
      if (props.autoselect && element) {
        element.select()
      }

      input.current = element
    },
    [input]
  )

  if (!doc) {
    return null
  }

  // span below input ensures that outer element is resized according
  // to the content causing input field also grow with it.
  return (
    <>
      <input
        ref={onRef}
        draggable={preventDrag}
        onDragStart={onDragStart}
        type="text"
        className="TitleEditor"
        defaultValue={doc[field]}
        placeholder={placeholder}
        onKeyDown={onKeyDown}
        onChange={onChange}
        onBlur={onBlur}
      />
      <span className="TitleEditor">{doc[field]}</span>
    </>
  )
}
