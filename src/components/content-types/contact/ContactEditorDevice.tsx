import React, { useCallback } from 'react'
import { Doc } from 'automerge'
import { PushpinUrl, parseDocumentLink, createDocumentLink } from '../../pushpin-code/ShareLink'
import { useDocument, Change, DocumentId } from 'automerge-repo-react-hooks'
import Content from '../../Content'
import ActionListItem from '../workspace/omnibox/ActionListItem'
import { DeviceDoc } from '../workspace/Device'
import { StoragePeerDoc } from '../storage-peer'
import './ContactEditor.css'

export interface Props {
  selfId: DocumentId
  deviceId: DocumentId
  isCurrentDevice: boolean
  onRemoveDevice: (url: DocumentId) => void
}

export type OnRemoveDevice = (documentId: DocumentId) => void

export default function ContactEditorDevice(props: Props) {
  const { selfId, deviceId, onRemoveDevice, isCurrentDevice } = props
  const { documentId: deviceDocId } = parseDocumentLink(deviceId)
  const [deviceDoc, changeDevice] = useDocument<DeviceDoc>(deviceDocId)

  const removeDevice = useCallback(() => {
    // XXX: We want to unregister from the storage peer when we remove it as a device.
    // We need a better way to do this, but for now just hack it here.
    if (isStoragePeer(deviceDoc)) {
      unregisterFromStoragePeer(changeDevice as Change<StoragePeerDoc>, selfId)
    }
    onRemoveDevice(deviceId)
  }, [deviceDoc, changeDevice, selfId, deviceId, onRemoveDevice])

  if (!deviceDoc) {
    return null
  }

  // XXX: Would be better to not recreate this every render.
  const deviceActions = [
    {
      name: 'remove',
      destructive: true,
      callback: () => () => removeDevice(),
      faIcon: 'fa-trash',
      label: 'Remove',
      shortcut: '⌘+⌫',
      keysForActionPressed: (e: KeyboardEvent) => (e.metaKey || e.ctrlKey) && e.key === 'Backspace',
    },
  ]

  return (
    <ActionListItem
      contentUrl={createDocumentLink('device', deviceId)}
      actions={isCurrentDevice ? [] : deviceActions}
      selected={false}
    >
      <Content context="list" url={deviceId} editable />
    </ActionListItem>
  )
}

function isStoragePeer(doc: unknown): doc is Doc<StoragePeerDoc> {
  return !!(doc as any).registry
}

function unregisterFromStoragePeer(
  changeStoragePeer: Change<StoragePeerDoc>,
  contactUrl: DocumentId
) {
  changeStoragePeer((doc) => {
    delete doc.registry[contactUrl]
  })
}
