import React, { useContext, useRef, Ref, ChangeEvent } from "react"

import {
  createDocumentLink,
  createWebLink,
  parseDocumentLink,
} from "../../pushpin-code/Url"

import DEFAULT_AVATAR_PATH from "../../../images/default-avatar.png"
import { ContentProps } from "../../Content"
import { ContactDoc } from "."

import { DocumentId } from "automerge-repo"
import { useDocument, useRepo } from "automerge-repo-react-hooks"
import Heading from "../../ui/Heading"
import SecondaryText from "../../ui/SecondaryText"

import { CurrentDeviceContext } from "../workspace/Device"
import { importFileList } from "../../pushpin-code/ImportData"
import ConnectionStatusBadge from "./ConnectionStatusBadge"
// import { useConnectionStatus } from '../../../PresenceHooks'
import Badge from "../../ui/Badge"
import CenteredStack from "../../ui/CenteredStack"
import { without } from "../../pushpin-code/Misc"
import ContactEditorDevice, { OnRemoveDevice } from "./ContactEditorDevice"
import ListMenuSection from "../../ui/ListMenuSection"
import ListMenuItem from "../../ui/ListMenuItem"
import TitleEditor from "../../TitleEditor"
import ListItem from "../../ui/ListItem"
import ListMenu from "../../ui/ListMenu"
import { USER_COLORS } from "./Constants"
import SharesSection from "./SharesSection"
import "./ContactEditor.css"
import ColorPicker from "../../ui/ColorPicker"
import { BinaryDataId, createBinaryDataUrl } from "../../../blobstore/Blob"
import localforage from "localforage"
import { WorkspaceDoc } from "../workspace/Workspace"

export default function ContactEditor(props: ContentProps) {
  const [doc, changeDoc] = useDocument<ContactDoc>(props.documentId)

  const [avatarImageDoc] = useDocument<any>(doc ? doc.avatarDocId : undefined)
  const { binaryDataId: avatarBinaryId } = avatarImageDoc || {}

  const currentDeviceId = useContext(CurrentDeviceContext)
  const hiddenFileInput = useRef<HTMLInputElement>(null)
  const status = "offline" // useConnectionStatus(props.documentId)

  const { documentId: selfUrl } = props

  if (!doc) {
    return null
  }

  function setColor(color: { hex: string }) {
    changeDoc((d) => {
      d.color = color.hex
    })
  }

  const { color, devices, invites } = doc

  const onImportClick = () => {
    if (hiddenFileInput.current) {
      hiddenFileInput.current.click()
    }
  }

  // xxx: only allow images & only one
  const onFilesChanged = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    importFileList(e.target.files, (url) =>
      changeDoc((doc) => {
        const { documentId } = parseDocumentLink(url)
        doc.avatarDocId = documentId
      })
    )
  }

  function removeDevice(deviceId: DocumentId) {
    changeDoc((d) => {
      const devices = d.devices
      if (!devices) {
        return
      }
      without(deviceId, devices)
    })
  }

  return (
    <CenteredStack centerText={false}>
      <ListMenu>
        <div className="ContactEditor-heading">
          <Heading>Edit Profile...</Heading>
        </div>
        {renderNameEditor(props.documentId)}
        {renderAvatarEditor(
          avatarBinaryId,
          onFilesChanged,
          hiddenFileInput,
          onImportClick
        )}
        {renderPresenceColorSelector(color, setColor)}
        {renderDevices(devices, status, selfUrl, removeDevice, currentDeviceId)}
        <SharesSection invites={invites} />
        <MergeProfileSection />
      </ListMenu>
    </CenteredStack>
  )
}

const MergeProfileSection = () => {
  const repo = useRepo()

  async function mergeWithOtherProfile() {
    const newProfileDocId = prompt(
      "Please enter the id of the profile that you want to merge"
    )

    if (!newProfileDocId) {
      return
    }

    const currentProfileDocId = (await localforage.getItem(
      "workspaceDocId"
    )) as DocumentId

    if (newProfileDocId === currentProfileDocId) {
      alert("You entered your current profile id")
      return
    }

    const currentProfileDoc = (await repo
      .find(currentProfileDocId)
      .value()) as WorkspaceDoc

    const newProfileDocHandle = repo.find(newProfileDocId as DocumentId)

    const newProfileDoc = (await newProfileDocHandle.value()) as WorkspaceDoc

    newProfileDocHandle.change((doc) => {
      const newProfileDoc = doc as WorkspaceDoc

      if (!newProfileDoc.viewedDocUrls) {
        alert("The entered id is not a valid profile doc id")
        return
      }

      for (const contactId of currentProfileDoc.contactIds) {
        if (!newProfileDoc.contactIds.includes(contactId)) {
          newProfileDoc.contactIds.push(contactId)
        }
      }

      for (const viewedDocUrl of currentProfileDoc.viewedDocUrls) {
        if (!newProfileDoc.viewedDocUrls.includes(viewedDocUrl)) {
          newProfileDoc.viewedDocUrls.push(viewedDocUrl)
        }
      }
    })

    // reload with new workspaceDocId after data has been copied over
    newProfileDocHandle.addListener("change", async () => {
      await localforage.setItem("workspaceDocId", newProfileDocId)

      location.href = createWebLink(
        location,
        createDocumentLink("contact", newProfileDoc.selfId)
      )
    })
  }

  async function copyProfileId() {
    const id = (await localforage.getItem("workspaceDocId")) as string
    navigator.clipboard.writeText(id)
  }

  return (
    <ListMenuSection title="Merging Profiles">
      <ListMenuItem>
        <CenteredStack
          direction="row"
          style={{
            gap: "var(--halfCellSize)",
            marginTop: "var(--halfCellSize)",
          }}
        >
          <button className="ContactEditor-button" onClick={copyProfileId}>
            Copy profile id
          </button>
          <button
            className="ContactEditor-button"
            onClick={mergeWithOtherProfile}
          >
            Merge with other profile
          </button>
        </CenteredStack>
      </ListMenuItem>
    </ListMenuSection>
  )
}

const renderNameEditor = (documentId: DocumentId) => (
  <ListMenuSection title="Display Name">
    <ListMenuItem>
      <TitleEditor field="name" documentId={documentId} />
    </ListMenuItem>
  </ListMenuSection>
)

const renderAvatarEditor = (
  avatarBinaryId: BinaryDataId | null,
  onFilesChanged: (e: ChangeEvent<HTMLInputElement>) => void,
  hiddenFileInput: Ref<HTMLInputElement>,
  onImportClick: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void
) => {
  return (
    <ListMenuSection title="Avatar">
      <ListMenuItem>
        <CenteredStack
          direction="row"
          style={{
            gap: "var(--halfCellSize)",
            marginTop: "var(--halfCellSize)",
          }}
        >
          <Badge
            img={
              avatarBinaryId
                ? createBinaryDataUrl(avatarBinaryId)
                : DEFAULT_AVATAR_PATH
            }
          />
          <input
            style={{ display: "none" }}
            type="file"
            id="hiddenImporter"
            accept="image/*"
            onChange={onFilesChanged}
            ref={hiddenFileInput}
          />
          <button
            className="ContactEditor-button"
            type="button"
            onClick={onImportClick}
          >
            Choose from file...
          </button>
        </CenteredStack>
      </ListMenuItem>
    </ListMenuSection>
  )
}

const renderPresenceColorSelector = (
  color: string,
  setColor: (color: { hex: string }) => void
) => (
  <ListMenuSection title="Presence Color">
    <ListMenuItem>
      <ColorPicker
        color={color}
        colors={Object.values(USER_COLORS)}
        onChange={() => {}}
        onChangeComplete={setColor}
      />
    </ListMenuItem>
    <ListMenuItem>
      <SecondaryText>
        Your presence colour will be used by other authors to identify you when
        you are present within a document.
      </SecondaryText>
    </ListMenuItem>
  </ListMenuSection>
)

const renderDevices = (
  devices: DocumentId[] | undefined,
  status: string,
  selfId: DocumentId,
  removeDevice: OnRemoveDevice,
  currentDeviceId: DocumentId | undefined
) => {
  if (!devices) {
    return (
      <SecondaryText>
        Something is wrong, you should always have a device!
      </SecondaryText>
    )
  }
  const renderedDevices = devices.map((deviceId: DocumentId) => (
    <ContactEditorDevice
      key={deviceId}
      selfId={selfId}
      deviceId={deviceId}
      onRemoveDevice={removeDevice}
      isCurrentDevice={deviceId === currentDeviceId}
    />
  ))

  const title = (
    <>
      <ConnectionStatusBadge size="small" hover={false} contactId={selfId} />
      Devices
    </>
  )

  return (
    <ListMenuSection title={title}>
      {renderedDevices}
      {status !== "connected" ? (
        <ListMenuItem key="storage-peer-hint">
          <ListItem>
            <Badge backgroundColor="#00000000" size="medium" icon="cloud" />
            <SecondaryText>
              You aren't currently synchronizing to any other devices identified
              by this user ID.
            </SecondaryText>
          </ListItem>
        </ListMenuItem>
      ) : null}
    </ListMenuSection>
  )
}
