import React from "react"
import { DocumentId } from "automerge-repo"

import { createDocumentLink } from "../../pushpin-code/Url"
import Content from "../../Content"
import Heading from "../../ui/Heading"
import SecondaryText from "../../ui/SecondaryText"
import ListMenuSection from "../../ui/ListMenuSection"
import ListMenuItem from "../../ui/ListMenuItem"
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
              context="list"
              url={createDocumentLink("contact", contact as DocumentId)}
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
