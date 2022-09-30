import React from 'react'

import { ContentProps } from '../../Content'

import { useSelfId } from '../../pushpin-code/SelfHooks'

import ContactViewer from './ContactViewer'
import ContactEditor from './ContactEditor'
import './ContactWorkspace.css'

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
