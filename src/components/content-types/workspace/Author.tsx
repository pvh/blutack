import React from 'react'
import Content from '../../Content'
import { createDocumentLink } from '../../pushpin-code/ShareLink'
import { DocumentId, useDocument } from 'automerge-repo-react-hooks'
import { ContactDoc } from '../contact'
import './Author.css'

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
        context="title-bar"
        url={createDocumentLink('contact', props.contactId)}
        isPresent={props.isPresent}
      />
    </div>
  )
}
