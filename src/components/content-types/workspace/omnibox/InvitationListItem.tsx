import React from "react"
import Badge from "../../../../bootstrap/lib/ui/Badge"
import ListItem from "../../../../bootstrap/lib/ui/ListItem"
import { PushpinUrl } from "../../../../bootstrap/lib/blutack/Url"
import ContentDragHandle from "../../../../bootstrap/lib/ui/ContentDragHandle"
import TitleWithSubtitle from "../../../../bootstrap/lib/ui/TitleWithSubtitle"
import { DocumentId } from "automerge-repo"

export interface Props {
  url: PushpinUrl
  documentId: DocumentId
  invitation: any
  selected?: boolean
}

export default function InvitationListItem(props: Props) {
  const { invitation, url, documentId } = props

  const title = invitation.doc.title || "Untitled"
  const subtitle = `From ${invitation.sender.name}`

  return (
    <ListItem>
      <ContentDragHandle url={url}>
        <Badge
          icon="envelope"
          backgroundColor={invitation.doc && invitation.doc.backgroundColor}
        />
      </ContentDragHandle>
      <TitleWithSubtitle
        title={title}
        subtitle={subtitle}
        documentId={documentId}
      />
    </ListItem>
  )
}
