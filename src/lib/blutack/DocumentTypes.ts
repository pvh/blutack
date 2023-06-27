import { DocumentId } from "@automerge/automerge-repo"
import { ContentUrl } from "../blutack-content/Url"

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
  viewedDocUrls: ContentUrl[]
  contentTypeIds: DocumentId[]
}
