import React, { useState, useEffect } from "react"
import { ContentProps } from "../../Content"
import { DocumentId } from "@automerge/automerge-repo"
import { useDocument } from "@automerge/automerge-repo-react-hooks"

import Badge from "../../ui/Badge"
import "./Device.css"
import { useDeviceOnlineStatus } from "../../pushpin-code/PresenceHooks"
import TitleWithSubtitle from "../../ui/TitleWithSubtitle"
import { DocHandle } from "@automerge/automerge-repo"
import { ContentType } from "../../pushpin-code/ContentTypes"

export interface DeviceDoc {
  icon: string // fa-icon name
  name: string
}

interface Props extends ContentProps {
  editable: boolean
}

function Device(props: Props) {
  const [doc] = useDocument<DeviceDoc>(props.documentId)
  const isOnline = useDeviceOnlineStatus(props.documentId)
  if (!doc) return null
  const { icon = "desktop", name } = doc

  switch (props.context) {
    case "board":
      return (
        <div className={isOnline ? "DeviceListItem DeviceListItem--online" : "DeviceListItem"}>
          <div className="DeviceListItem-badge">
            <Badge
              icon={icon}
              shape="circle"
              size="large"
              backgroundColor={`var(${isOnline ? "--colorOnline" : "--colorOffline"})`}
            />
          </div>
          <TitleWithSubtitle
            title={name}
            titleEditorField="name"
            editable={props.editable}
            documentId={props.documentId}
          />
        </div>
      )
    case "badge":
      return (
        <Badge
          icon={icon}
          shape="circle"
          size="large"
          backgroundColor={`var(${isOnline ? "--colorOnline" : "--colorOffline"})`}
        />
      )
    default:
      return null
  }
}

export function create(deviceAttrs: any, handle: DocHandle<any>) {
  handle.change((doc: DeviceDoc) => {
    doc.name = "computer"
    doc.icon = "desktop"
  })
  // TODO: this stuff relied on electron magic to pick an icon and set a useful hostname
  //       really we should look at the user agent or something instead
  const isLaptop = true
  const icon = isLaptop ? "laptop" : "desktop"
  handle.change((doc: DeviceDoc) => {
    doc.name = icon
    doc.icon = icon
  })
}

export const contentType: ContentType = {
  type: "device",
  name: "Device",
  icon: "desktop",
  contexts: {
    board: Device,
    badge: Device,
  },
  resizable: false,
  unlisted: true,
  create,
}

export const CurrentDeviceContext = React.createContext<DocumentId | undefined>(undefined)
