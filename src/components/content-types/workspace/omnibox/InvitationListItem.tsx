import React from 'react'
import Badge from '../../../ui/Badge'
import ListItem from '../../../ui/ListItem'
import { PushpinUrl } from '../../../pushpin-code/ShareLink'
import ContentDragHandle from '../../../ui/ContentDragHandle'
import TitleWithSubtitle from '../../../ui/TitleWithSubtitle'
import { DocumentId } from 'automerge-repo'

export interface Props {
  url: PushpinUrl
  documentId: DocumentId
  invitation: any
  selected?: boolean
}

export default function InvitationListItem(props: Props) {
  const { invitation, url, documentId } = props

  const title = invitation.doc.title || 'Untitled'
  const subtitle = `From ${invitation.sender.name}`

  return (
    <ListItem>
      <ContentDragHandle url={url}>
        <Badge icon="envelope" backgroundColor={invitation.doc && invitation.doc.backgroundColor} />
      </ContentDragHandle>
      <TitleWithSubtitle title={title} subtitle={subtitle} documentId={documentId} />
    </ListItem>
  )
}
