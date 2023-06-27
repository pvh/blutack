import React, {
  forwardRef,
  ForwardRefRenderFunction,
  memo,
  Ref,
  useCallback,
  useEffect,
  useState,
} from "react"

import * as ContentTypes from "./ContentTypes"
import { parseDocumentLink, ContentUrl } from "./Url"
import Crashable from "../ui/Crashable"
import { DocumentId } from "@automerge/automerge-repo"
import { useSelfId } from "../blutack/SelfHooks"
import { useHeartbeat } from "../blutack/PresenceHooks"

// this is the interface imported by Content types
export interface ContentProps {
  context?: ContentTypes.Context
  type: string
  documentId: DocumentId
  selfId: DocumentId
  contentRef?: Ref<ContentHandle>
}

// I don't think this is a good longterm solution but it'll do for now.
export interface EditableContentProps extends ContentProps {
  editable: boolean
}

// These are the props the generic Content wrapper receives
interface Props {
  url: ContentUrl
  context: ContentTypes.Context
  [arbitraryProp: string]: any
}

export interface ContentHandle {
  onContent: (url: ContentUrl) => boolean
}

const Content: ForwardRefRenderFunction<ContentHandle, Props> = (
  props: Props,
  ref: Ref<ContentHandle>
) => {
  const { context = "expanded", url } = props
  const { documentId, type } = parseDocumentLink(url)

  const [isCrashed, setCrashed] = useState(false)
  const selfId = useSelfId()
  const onCatch = useCallback(() => setCrashed(true), [])

  useHeartbeat(["expanded"].includes(context) ? documentId : undefined)

  useEffect(() => {
    setCrashed(false)
  }, [documentId, type])

  const contentType = ContentTypes.lookup({ type, context })

  if (!contentType) {
    return renderMissingType(type, context)
  }

  if (isCrashed) {
    return renderError(type)
  }

  const key = `${documentId}/${type}`

  return (
    <Crashable onCatch={onCatch}>
      <contentType.component
        {...props}
        contentRef={ref}
        key={key}
        type={type}
        documentId={documentId}
        selfId={selfId}
      />
    </Crashable>
  )
}

function renderError(type: string) {
  return (
    <div>
      <i className="fa fa-exclamation-triangle" />A &quot;{type}&quot; threw an error during render.
    </div>
  )
}

function renderMissingType(type: string, context: ContentTypes.Context) {
  return (
    <div>
      <i className="fa fa-exclamation-triangle" />
      Component of type &quot;{type}&quot; in context &quot;{context}&quot; not found.
    </div>
  )
}

export default memo(forwardRef(Content))
