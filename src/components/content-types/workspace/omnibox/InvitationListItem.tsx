import React from "react"
import Badge from "../../../../lib/ui/Badge"
import ListItem from "../../../../lib/ui/ListItem"
import { PushpinUrl } from "../../../../lib/blutack/Url"
import ContentDragHandle from "../../../../lib/ui/ContentDragHandle"
import TitleWithSubtitle from "../../../../lib/ui/TitleWithSubtitle"
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
