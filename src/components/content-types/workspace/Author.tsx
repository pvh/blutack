import React from "react"
import Content from "../../../lib/blutack/Content"
import { createDocumentLink } from "../../../lib/blutack/Url"
import { DocumentId } from "automerge-repo"
import { useDocument } from "automerge-repo-react-hooks"

import { ContactDoc } from "../contact"
import "./Author.css"

interface Props {
  contactId: DocumentId
  isPresent: boolean
}

export default function Author(props: Props) {
  const [contact] = useDocument<ContactDoc>(props.contactId)
  if (!contact) return null
  return (
    <div className="Author" data-name={contact.name}>
      <Content
        context="badge"
        url={createDocumentLink("contact", props.contactId)}
        isPresent={props.isPresent}
      />
    </div>
  )
}
