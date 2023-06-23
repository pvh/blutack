import React from "react"
import { DocumentId } from "automerge-repo"

import { createDocumentLink } from "../../../lib/blutack/Url"
import Content from "../../../lib/blutack/Content"
import Heading from "../../../lib/ui/Heading"
import SecondaryText from "../../../lib/ui/SecondaryText"
import ListMenuSection from "../../../lib/ui/ListMenuSection"
import ListMenuItem from "../../../lib/ui/ListMenuItem"
import { ContactDocInvites } from "."

interface Props {
  invites: ContactDocInvites
}

export default function SharesSection(props: Props) {
  const { invites } = props
  return (
    <ListMenuSection title="Shares">
      {invites ? (
        Object.entries(invites).map(([contact, shares]) => (
          <ListMenuItem key={contact}>
            <Content
              url={createDocumentLink("contact", contact as DocumentId)}
              context="badge"
            />
            <Content
              url={createDocumentLink("contact", contact as DocumentId)}
              context="title"
              editable
            />
            <SecondaryText>{shares.length} items shared</SecondaryText>
          </ListMenuItem>
        ))
      ) : (
        <ListMenuItem>
          <Heading>No shares...</Heading>
        </ListMenuItem>
      )}
    </ListMenuSection>
  )
}
