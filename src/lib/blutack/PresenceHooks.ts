import { useState, useEffect, useContext } from "react"
import { parseDocumentLink, createDocumentLink, PushpinUrl } from "./Url"
import { useTimeouts, useMessaging } from "./Hooks"
import { useSelfId } from "./SelfHooks"
import { CurrentDeviceContext } from "../../components/content-types/workspace/Device"
import { ContactDoc } from "../../components/content-types/contact"
import { ChannelId, DocumentId } from "automerge-repo"
import { useDocument, useRepo } from "automerge-repo-react-hooks"

/**
 * heartbeats are an accumulated list of the URLs we have "open" and so should
 * report heartbeats (and forward our "presence data") to.
 */
const heartbeats: { [url: DocumentId]: number } = {}

/**
 * myPresence is the data (per-url) that we send to our peers
 */
const myPresence: {
  [documentId: DocumentId]: { [key: string]: unknown }
} = {}

const HEARTBEAT_INTERVAL = 1000 // ms

export interface RemotePresence<P> {
  contact: DocumentId
  device: DocumentId
  data?: P
}

export interface RemotePresenceCache<P> {
  [contactAndDevice: string]: RemotePresence<P>
}

interface HeartbeatMessage {
  contact: DocumentId
  device: DocumentId
  heartbeat?: boolean
  departing?: boolean
  data?: any
}

/**
 * Send all the heartbeats associated with every document
 * @param contact: (selfId DocumentId)
 */
export function useAllHeartbeats(contact: DocumentId | undefined) {
  const repo = useRepo()
  const device = useContext(CurrentDeviceContext)

  useEffect(() => {
    if (!contact) {
      return () => {}
    }
    if (!device) {
      return () => {}
    }

    const interval = setInterval(() => {
      // Post a presence heartbeat on documents currently considered
      // to be open, allowing any kind of card to render a list of "present" folks.
      Object.entries(heartbeats).forEach(([documentId, count]) => {
        // NB: casts below are because Object.entries gives us string-flavored keys
        if (count > 0) {
          const msg: HeartbeatMessage = {
            contact,
            device,
            heartbeat: true,
            data: myPresence[documentId as DocumentId],
          }
          repo.ephemeralData.broadcast(documentId as ChannelId, msg)
        } else {
          depart(documentId as ChannelId)
          delete heartbeats[documentId as DocumentId]
        }
      })
    }, HEARTBEAT_INTERVAL)

    // this slightly confusing type is because we broadcast the documentID
    // AS the channelId
    // though even more confusingly the current version prepends it with m/
    // to separate it from sync traffic about the document itself.
    function depart(documentId: ChannelId) {
      if (!contact || !device) {
        return
      }
      const departMessage: HeartbeatMessage = {
        contact,
        device,
        departing: true,
      }
      repo.ephemeralData.broadcast(documentId, departMessage)
    }

    return () => {
      clearInterval(interval)
      // heartbeats can't have DocumentIds as keys, so we do this
      Object.entries(heartbeats).forEach(([documentId]) =>
        depart(documentId as ChannelId)
      )
    }
  }, [contact, device, repo])
}

export function useHeartbeat(docUrl: DocumentId | undefined) {
  useEffect(() => {
    if (!docUrl) {
      return () => {}
    }

    heartbeats[docUrl] = (heartbeats[docUrl] || 0) + 1

    return () => {
      heartbeats[docUrl] && (heartbeats[docUrl] -= 1)
    }
  }, [docUrl])
}

function remotePresenceToLookupKey<T>(presence: RemotePresence<T>): string {
  return `${presence.contact}@${presence.device}`
}
function lookupKeyToPresencePieces(key: string): [DocumentId, DocumentId] {
  const [contact, device] = key.split("@")
  return [contact as DocumentId, device as DocumentId]
}

export function usePresence<P>(
  url: DocumentId | undefined,
  presence?: P,
  key = "/"
): RemotePresence<P>[] {
  const [remote, setRemoteInner] = useState<RemotePresenceCache<P>>({})
  const setSingleRemote = (presence: RemotePresence<P>) => {
    setRemoteInner((prev) => ({
      ...prev,
      [remotePresenceToLookupKey(presence)]: { ...presence },
    }))
  }

  const [bumpTimeout, depart] = useTimeouts(
    HEARTBEAT_INTERVAL * 2,
    (key: string) => {
      const [contact, device] = lookupKeyToPresencePieces(key)
      setSingleRemote({ contact, device, data: undefined })
    }
  )

  useMessaging<HeartbeatMessage>(url, (msg) => {
    const { contact, device, heartbeat, departing, data } = msg
    const presence = { contact, device, data }
    if (heartbeat || data !== undefined) {
      bumpTimeout(remotePresenceToLookupKey(presence))
      setSingleRemote(presence)
    } else if (departing) {
      depart(remotePresenceToLookupKey(presence))
    }
  })

  useEffect(() => {
    if (!url || !key) return () => {}

    if (!myPresence[url]) {
      myPresence[url] = {}
    }

    if (presence === undefined) {
      delete myPresence[url][key]
    } else {
      myPresence[url][key] = presence
    }

    return () => {
      delete myPresence[url][key]
    }
  }, [key, presence, url])

  const result = Object.values(remote)
    .filter((presence) => presence.data)
    .map((presence) => ({ ...presence, data: (presence.data || {})![key] }))

  return result
}

/**
 * For a given contact, return the device urls (as pushpin urls) which are online
 * devices for that context. Will return an empty array if no device is online for the contact.
 * If the contact is self (the current user), the current device will be listed first.
 */
export function useOnlineDevicesForContact(
  contactId?: DocumentId
): DocumentId[] {
  const selfId = useSelfId()
  const selfDeviceId = useContext(CurrentDeviceContext)

  const onlineRemotes = usePresence(contactId).filter(
    (p) => p.contact === contactId
  )
  const remoteDevices = onlineRemotes.map((presence) => presence.device)

  if (selfId === contactId && selfDeviceId) {
    remoteDevices.unshift(selfDeviceId)
  }
  return remoteDevices
}

export function useContactOnlineStatus(contactId?: DocumentId): boolean {
  const selfId = useSelfId()
  const presence = usePresence(contactId, {}, "onlineStatus")
  return selfId === contactId || presence.some((p) => p.contact === contactId)
}

/**
 * For a given device, return whether or not the device is online.
 * If the passed device is the current device, always returns true.
 */
export function useDeviceOnlineStatus(deviceId?: DocumentId): boolean {
  const currentDeviceId = useContext(CurrentDeviceContext)
  const isCurrentDevice = currentDeviceId === deviceId
  const presence = usePresence(deviceId, {}, "onlineStatus")
  return isCurrentDevice || presence.some((p) => p.device === deviceId)
}

type NotConnected = "not-connected" // There are other devices to connect to, and connected to at least one.
type NoDevices = "self-no-devices" // No other devices are available to connect to.
type Unreachable = "self-unreachable" // There are other devices to connect to, but not connected to any of them.
type Connected = "connected" // There are other devices to connect to, and connected to at least one.
type ConnectionStatus = NotConnected | NoDevices | Unreachable | Connected
export function useConnectionStatus(contactId?: DocumentId): ConnectionStatus {
  const [contact] = useDocument<ContactDoc>(contactId)
  const selfId = useSelfId()
  const onlineDevices = useOnlineDevicesForContact(contactId)

  if (selfId !== contactId) {
    return onlineDevices.length > 0 ? "connected" : "not-connected"
  }

  if (!contact || !contact.devices || contact.devices.length <= 1)
    return "self-no-devices"

  return onlineDevices.length > 1 ? "connected" : "self-unreachable"
}
