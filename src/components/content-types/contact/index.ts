import * as ContentTypes from "../../pushpin-code/ContentTypes"

import ContactWorkspace from "./ContactWorkspace"
import ContactInVarious from "./ContactInVarious"
import { USER_COLORS } from "./Constants"

import "./Avatar.css"
import { DocumentId } from "automerge-repo"
import { DocHandle } from "automerge-repo"
import { PushpinUrl } from "../../pushpin-code/Url"

export type ContactDocInvites = {
  [url: string]: PushpinUrl[] /* Crypto.Box[] */
}
export interface ContactDoc {
  name: string
  color: string
  avatarDocId: DocumentId
  invites: ContactDocInvites
  devices?: DocumentId[]
  encryptionKey?: null // Crypto.SignedMessage<Crypto.EncodedPublicEncryptionKey>;
}

function create(_typeAttrs: any, handle: DocHandle<any>) {
  handle.change((doc) => {
    doc.name = "Someone"
    const USER_COLOR_VALUES = Object.values(USER_COLORS)
    const color =
      USER_COLOR_VALUES[Math.floor(Math.random() * USER_COLOR_VALUES.length)]
    doc.color = color
  })
}

ContentTypes.register({
  type: "contact",
  name: "Contact",
  icon: "sticky-note",
  resizable: true,
  unlisted: true,
  create,
  contexts: {
    workspace: ContactWorkspace,
    board: ContactInVarious,
    list: ContactInVarious,
    thread: ContactInVarious,
    "title-bar": ContactInVarious,
  },
})
