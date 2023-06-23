import React from "react"

import { ContentProps } from "../../../bootstrap/lib/blutack/Content"

import { useSelfId } from "../../../bootstrap/lib/blutack/SelfHooks"

import ContactViewer from "./ContactViewer"
import ContactEditor from "./ContactEditor"
import "./ContactWorkspace.css"

export default function ContactWorkspace(props: ContentProps) {
  const { documentId: contactId } = props
  const selfId = useSelfId()
  const isSelf = selfId === contactId
  return (
    <div className="ContactWorkspace">
      {isSelf ? <ContactEditor {...props} /> : <ContactViewer {...props} />}
    </div>
  )
}
