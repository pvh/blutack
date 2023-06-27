import { DocumentId } from "automerge-repo"
import { PushpinUrl } from "./Url"

export interface ContactDoc {
  name: string
  color: string
  avatarDocId: DocumentId
  devices?: DocumentId[]
}

export interface TextDoc {
  title: string
  text: string
}

export interface ProfileDoc {
  selfId: DocumentId
  contactIds: DocumentId[]
  homeDocUrl: DocumentId
  viewedDocUrls: PushpinUrl[]
  contentTypeIds: DocumentId[]
}
