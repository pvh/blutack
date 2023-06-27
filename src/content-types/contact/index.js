const USER_COLORS = {
  // RUST: '#D96767',
  // ENGINEER: '#FFE283',
  // KEYLIME: '#A1E991',
  // PINE: '#63D2A5',
  // SOFT: '#64BCDF',
  // BIGBLUE: '#3A66A3',
  // ROYAL: '#A485E2',
  // KAWAII: '#ED77AB',
  // BLACK: '#2b2b2b',
  RED: "#F87060",
  VORANGE: "#FFC919",
  DARKGRE: "#6CCB44",
  PINETO: "#00CA7B",
  VBLAU: "#3395E8",
  CHILBLAU: "#004098",
  OPTIROYA: "#4700D8",
  MAGEGENTA: "#E80FA7",
  GRAU: "#626262",
}

/*

export interface ContactDoc {
  name: string
  color: string
  avatarDocId: DocumentId
  invites: ContactDocInvites
  devices?: DocumentId[]
  encryptionKey?: null // Crypto.SignedMessage<Crypto.EncodedPublicEncryptionKey>;
}
 */

function create(_typeAttrs, handle) {
  handle.change((doc) => {
    doc.name = "Someone"
    const USER_COLOR_VALUES = Object.values(USER_COLORS)
    doc.color = USER_COLOR_VALUES[Math.floor(Math.random() * USER_COLOR_VALUES.length)]
  })
}

export const contentType = {
  type: "contact",
  name: "Contact",
  icon: "sticky-note",
  resizable: true,
  unlisted: true,
  create,
  contexts: {},
}
