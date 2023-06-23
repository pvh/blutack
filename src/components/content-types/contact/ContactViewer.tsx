import { createDocumentLink, PushpinUrl } from "../../../bootstrap/lib/blutack/Url"

import DEFAULT_AVATAR_PATH from "../../../images/default-avatar.png"
import Content, { ContentProps } from "../../../bootstrap/lib/blutack/Content"
import { ContactDoc } from "."
import { FileDoc } from "../files"

import { DocumentId } from "automerge-repo"
import { useDocument } from "automerge-repo-react-hooks"

import Heading from "../../../bootstrap/lib/ui/Heading"
import SecondaryText from "../../../bootstrap/lib/ui/SecondaryText"

import ConnectionStatusBadge from "./ConnectionStatusBadge"
import Badge from "../../../bootstrap/lib/ui/Badge"
import CenteredStack from "../../../bootstrap/lib/ui/CenteredStack"
import ListMenuSection from "../../../bootstrap/lib/ui/ListMenuSection"
import ListMenuItem from "../../../bootstrap/lib/ui/ListMenuItem"
import SharesSection from "./SharesSection"

// @ts-ignore-next-line
import { Swatch } from "react-color/lib/components/common/Swatch"

import "./ContactEditor.css"
import ListMenu from "../../../bootstrap/lib/ui/ListMenu"
import ListItem from "../../../bootstrap/lib/ui/ListItem"

export default function ContactViewer(props: ContentProps) {
  const { documentId: contactId } = props
  const [doc] = useDocument<ContactDoc>(contactId)
  const [avatarImageDoc] = useDocument<FileDoc>(doc && doc.avatarDocId)
  const avatarImageUrl = avatarImageDoc
    ? avatarImageDoc.binaryDataId
    : DEFAULT_AVATAR_PATH

  if (!doc) {
    return null
  }
  const { devices, invites } = doc

  return (
    <CenteredStack centerText={false}>
      <ListMenu>
        <ListMenuSection title="Display Name">
          <ListMenuItem>
            <Heading>{doc.name}</Heading>
          </ListMenuItem>
        </ListMenuSection>
        <ListMenuSection title="Avatar">
          <ListMenuItem>
            <Badge img={avatarImageUrl} />
          </ListMenuItem>
        </ListMenuSection>
        <ListMenuSection title="Presence Color">
          <ListMenuItem>
            <div className="ColorPicker__swatch">
              <Swatch
                color={doc.color}
                hex={doc.color}
                onClick={() => {}}
                focusStyle={{ border: `0 0 4px ${doc.color}` }}
              />
            </div>
          </ListMenuItem>
          <ListMenuItem>
            <SecondaryText>
              {doc.name}&apos;s presence colour can be used to identify them
              when they are present within a document.
            </SecondaryText>
          </ListMenuItem>
        </ListMenuSection>
        {renderDevices(devices, contactId)}
        <SharesSection invites={invites} />
      </ListMenu>
    </CenteredStack>
  )
}

const renderDevices = (
  devices: DocumentId[] | undefined,
  contactId: DocumentId
) => {
  if (!devices) {
    return (
      <SecondaryText>
        Something is wrong, you should always have a device!
      </SecondaryText>
    )
  }
  const renderedDevices = devices
    .map((deviceUrl: DocumentId) => createDocumentLink("device", deviceUrl))
    .map((deviceId: PushpinUrl) => (
      <ListMenuItem key={deviceId}>
        <ListItem>
          <Content context="badge" url={deviceId} />
          <Content context="title" url={deviceId} editable />
        </ListItem>
      </ListMenuItem>
    ))

  const title = (
    <>
      <ConnectionStatusBadge size="small" hover={false} contactId={contactId} />
      Devices
    </>
  )

  return <ListMenuSection title={title}>{renderedDevices}</ListMenuSection>
}
