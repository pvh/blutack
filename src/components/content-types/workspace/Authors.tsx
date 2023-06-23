import React, { useEffect } from "react"
import Debug from "debug"

import { PushpinUrl, parseDocumentLink } from "../../../bootstrap/lib/blutack/Url"
import { WorkspaceDoc as WorkspaceDoc } from "./Workspace"
import Author from "./Author"

import "./Authors.css"
import { DocumentId } from "automerge-repo"
import { useDocument } from "automerge-repo-react-hooks"

import { useSelfId } from "../../../bootstrap/lib/blutack/SelfHooks"
import { usePresence } from "../../../bootstrap/lib/blutack/PresenceHooks"
import { List } from "@automerge/automerge"

const log = Debug("pushpin:authors")

interface Props {
  workspaceDocId: DocumentId
  currentDocUrl: PushpinUrl
}

interface DocWithAuthors {
  authorIds: DocumentId[]
  hypermergeUrl: DocumentId
}

export default function Authors({ workspaceDocId, currentDocUrl }: Props) {
  const authorIds = useAuthors(currentDocUrl, workspaceDocId)
  const currentDocId = parseDocumentLink(currentDocUrl).documentId
  const presence: any[] = usePresence(currentDocId)

  // Remove self from the authors list.
  const selfId = useSelfId()
  const authors = authorIds
    .filter((authorId) => authorId !== selfId)
    .filter((id, i, a) => a.indexOf(id) === i)
    .map((id) => (
      <Author key={id} contactId={id} isPresent={presence.some((p) => p.contact === id)} />
    ))

  return <div className="Authors">{authors}</div>
}

export function useAuthors(currentDocUrl: PushpinUrl, workspaceDocId: DocumentId): DocumentId[] {
  const { type, documentId } = parseDocumentLink(currentDocUrl)
  const [workspace, changeWorkspace] = useDocument<WorkspaceDoc>(workspaceDocId)
  const [doc, changeDoc] = useDocument<DocWithAuthors>(documentId)
  const selfId = useSelfId()

  useEffect(() => {
    if (!workspace || !doc) {
      return
    }

    log("updating workspace contacts")

    const { authorIds = [] } = doc

    // Add any never-before seen authors to our contacts.
    // TODO: this is why we can't really delete authors from our contacts too
    changeWorkspace(({ contactIds }) => {
      const newContactIds = authorIds.filter((a) => selfId !== a && !contactIds.includes(a))

      if (newContactIds.length) {
        contactIds.push(...newContactIds)
      }
    })
  }, [selfId, doc && doc.authorIds])

  useEffect(() => {
    if (!workspace || !doc || type === "contact") {
      return
    }

    log("adding self to authors")

    // Add ourselves to the authors if we haven't yet.
    // TODO: we should really block on doing this until first edit!
    changeDoc((doc) => {
      if (!doc.authorIds) {
        doc.authorIds = [] as unknown as List<DocumentId>
      }

      if (selfId && !doc.authorIds.includes(selfId)) {
        doc.authorIds.push(selfId)
      }
    })
  }, [selfId, doc ? doc.authorIds : false])

  return (doc && doc.authorIds) || []
}
