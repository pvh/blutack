import React, {
  useState,
  useCallback,
  useEffect,
  forwardRef,
  Ref,
  memo,
  ForwardRefRenderFunction,
} from "react"

import * as ContentTypes from "./pushpin-code/ContentTypes"
import { parseDocumentLink, PushpinUrl } from "./pushpin-code/Url"
import Crashable from "./Crashable"
import { DocumentId } from "@automerge/automerge-repo"
import { useSelfId } from "./pushpin-code/SelfHooks"
import { useHeartbeat } from "./pushpin-code/PresenceHooks"
import { useDocument } from "../../../automerge-repo/packages/automerge-repo-react-hooks"

// this is the interface imported by Content types
export interface ContentProps {
  context: ContentTypes.Context
  url: PushpinUrl
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
  url: PushpinUrl
  context: ContentTypes.Context
  typeOverride?: string
  [arbitraryProp: string]: any
}

export interface ContentHandle {
  onContent: (url: PushpinUrl) => boolean
}

const Content: ForwardRefRenderFunction<ContentHandle, Props> = (
  props: Props,
  ref: Ref<ContentHandle>
) => {
  const { context, url, typeOverride } = props

  const [isCrashed, setCrashed] = useState(false)
  const selfId = useSelfId()
  const onCatch = useCallback(() => setCrashed(true), [])

  const { type: linkType, documentId } = parseDocumentLink(url)

  const type = typeOverride || linkType

  useHeartbeat(["expanded"].includes(context) ? documentId : undefined)

  useEffect(() => {
    setCrashed(false)
  }, [url])

  if (!url) {
    return null
  }

  const contentType = ContentTypes.lookup({ type, context })

  if (!contentType) {
    return renderMissingType(type, context)
  }

  if (isCrashed) {
    return renderError(type)
  }

  return (
    <Crashable onCatch={onCatch}>
      <contentType.component
        {...props}
        contentRef={ref}
        key={url}
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
