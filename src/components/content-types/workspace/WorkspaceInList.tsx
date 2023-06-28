import React from "react"
import Content, { ContentProps } from "../../Content"
import { useDocument } from "@automerge/automerge-repo-react-hooks"
import Badge from "../../ui/Badge"
import { WorkspaceDoc } from "./Workspace"
import { createDocumentLink } from "../../pushpin-code/Url"
import { ContactDoc } from "../contact"
import "./WorkspaceInList.css"
import ListItem from "../../ui/ListItem"
import ContentDragHandle from "../../ui/ContentDragHandle"
import TitleWithSubtitle from "../../ui/TitleWithSubtitle"

export default function WorkspaceListItem(props: ContentProps) {
  const { url, documentId } = props
  const [doc] = useDocument<WorkspaceDoc>(documentId)
  const [selfDoc] = useDocument<ContactDoc>(doc && doc.selfId)

  if (!doc || !selfDoc) {
    return null
  }

  const { selfId, viewedDocUrls } = doc

  const title = `Workspace for ${selfDoc.name}`
  const subtitle = `${viewedDocUrls.length} item${
    viewedDocUrls.length !== 1 ? "s" : ""
  }`
  return (
    <ListItem>
      <ContentDragHandle url={url}>
        <Badge icon="briefcase" backgroundColor={selfDoc.color} />
        <div className="WorkspaceLink-ContactOverlay">
          <Content
            url={createDocumentLink("contact", selfId)}
            context="badge"
          />
        </div>
      </ContentDragHandle>
      <TitleWithSubtitle
        title={title}
        subtitle={subtitle}
        documentId={documentId}
      />
    </ListItem>
  )
}
