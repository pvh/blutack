import { useCallback } from "react"
import { createDocumentLink } from "../../../lib/blutack/Url"
import { DocumentId } from "automerge-repo"
import { useDocument } from "automerge-repo-react-hooks"
import Content from "../../../lib/blutack/Content"
import ActionListItem from "../workspace/omnibox/ActionListItem"
import { DeviceDoc } from "../workspace/Device"

import "./ContactEditor.css"
import ListItem from "../../../lib/ui/ListItem"

export interface Props {
  selfId: DocumentId
  deviceId: DocumentId
  isCurrentDevice: boolean
  onRemoveDevice: (url: DocumentId) => void
}

export type OnRemoveDevice = (documentId: DocumentId) => void

export default function ContactEditorDevice(props: Props) {
  const { selfId, deviceId, onRemoveDevice, isCurrentDevice } = props
  const [deviceDoc, changeDevice] = useDocument<DeviceDoc>(deviceId)

  const removeDevice = useCallback(() => {
    onRemoveDevice(deviceId)
  }, [deviceDoc, changeDevice, selfId, deviceId, onRemoveDevice])

  if (!deviceDoc) {
    return null
  }

  // XXX: Would be better to not recreate this every render.
  const deviceActions = [
    {
      name: "remove",
      destructive: true,
      callback: () => () => removeDevice(),
      faIcon: "fa-trash",
      label: "Remove",
      shortcut: "⌘+⌫",
      keysForActionPressed: (e: KeyboardEvent) => (e.metaKey || e.ctrlKey) && e.key === "Backspace",
    },
  ]

  const url = createDocumentLink("device", deviceId)
  return (
    <ActionListItem
      contentUrl={url}
      actions={isCurrentDevice ? [] : deviceActions}
      selected={false}
    >
      <ListItem>
        <Content url={url} context="badge" />
        <Content url={url} context="title" editable />
      </ListItem>
    </ActionListItem>
  )
}
