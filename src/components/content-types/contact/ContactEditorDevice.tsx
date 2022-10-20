import { useCallback } from "react"
import { createDocumentLink } from "../../pushpin-code/ShareLink"
import { DocumentId } from "automerge-repo"
import { useDocument, Change } from "automerge-repo-react-hooks"
import Content from "../../Content"
import ActionListItem from "../workspace/omnibox/ActionListItem"
import { DeviceDoc } from "../workspace/Device"

import "./ContactEditor.css"

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
      keysForActionPressed: (e: KeyboardEvent) =>
        (e.metaKey || e.ctrlKey) && e.key === "Backspace",
    },
  ]

  return (
    <ActionListItem
      contentUrl={createDocumentLink("device", deviceId)}
      actions={isCurrentDevice ? [] : deviceActions}
      selected={false}
    >
      <Content context="list" url={deviceId} editable />
    </ActionListItem>
  )
}
