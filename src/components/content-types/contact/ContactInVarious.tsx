import React from "react"
import Debug from "debug"
import classNames from "classnames"

import Content, { ContentProps } from "../../../bootstrap/lib/blutack/Content"
import { ContactDoc } from "."

import { createDocumentLink } from "../../../bootstrap/lib/blutack/Url"
import DEFAULT_AVATAR_PATH from "../../../images/default-avatar.png"

import "./ContactInVarious.css"
import { useDocument, useRepo } from "automerge-repo-react-hooks"
import ConnectionStatusBadge from "./ConnectionStatusBadge"
import ListItem from "../../../bootstrap/lib/ui/ListItem"
import ContentDragHandle from "../../../bootstrap/lib/ui/ContentDragHandle"
import TitleWithSubtitle from "../../../bootstrap/lib/ui/TitleWithSubtitle"
import CenteredStack from "../../../bootstrap/lib/ui/CenteredStack"
import Heading from "../../../bootstrap/lib/ui/Heading"
import {
  DocWithUrlState,
  getCurrentDocId,
  loadUrlOfUser,
  openDoc,
} from "../../../bootstrap/lib/blutack/Url"
import { useSelfId } from "../../../bootstrap/lib/blutack/SelfHooks"

const log = Debug("pushpin:settings")

ContactInVarious.minWidth = 4
ContactInVarious.minHeight = 5
ContactInVarious.defaultWidth = 4

export interface ContactProps extends ContentProps {
  isPresent?: boolean
}

export default function ContactInVarious(props: ContactProps) {
  const selfId = useSelfId()
  const repo = useRepo()
  const [contact] = useDocument<ContactDoc>(props.documentId)

  const avatarDocId = contact ? contact.avatarDocId : null
  const name = contact ? contact.name : null

  if (!contact) {
    return null
  }

  const { context, url, documentId, isPresent } = props
  const { color } = contact

  const avatarImage = avatarDocId ? (
    <Content
      context="expanded"
      url={createDocumentLink("image", avatarDocId)}
    />
  ) : (
    <img alt="avatar" src={DEFAULT_AVATAR_PATH} />
  )

  // TODO: resolve conflict between double and single click

  const onDoubleClick = (e: React.MouseEvent) => {
    openDoc(url)
    e.stopPropagation()
  }

  const onClick = () => {
    if (!props.isPresent || props.documentId === selfId) {
      return
    }

    const currentDocId = getCurrentDocId()

    if (!currentDocId) {
      return
    }

    repo
      .find(currentDocId)
      .value()
      .then((doc) => {
        loadUrlOfUser(doc as DocWithUrlState, props.documentId)
      })
  }

  const avatar = (
    <div
      className="Contact-avatar"
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      <div
        className={classNames(
          "Avatar",
          `Avatar--${context}`,
          isPresent && "Avatar--present"
        )}
        style={{ ["--highlight-color" as any]: color }}
        data-name={name}
      >
        {avatarImage}
      </div>
      <div className="Contact-status">
        <ConnectionStatusBadge contactId={props.documentId} />
      </div>
    </div>
  )

  switch (context) {
    case "badge":
      return <ContentDragHandle url={url}>{avatar}</ContentDragHandle>
    case "board":
      return (
        <CenteredStack>
          {avatar}
          <Heading wrap>{name || ""}</Heading>
        </CenteredStack>
      )
    default:
      log("contact render called in an unexpected context")
      return null
  }
}
