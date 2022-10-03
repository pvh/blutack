import React, { useCallback } from 'react'
import { createDocumentLink, PushpinUrl } from '../../../pushpin-code/ShareLink'
import { DocumentId } from 'automerge-repo'
import { useDocument, useRepo } from 'automerge-repo-react-hooks'
import Content from '../../../Content'
import { WorkspaceDoc as WorkspaceDoc } from '../Workspace'
import { ContactDoc } from '../../contact'
import OmniboxWorkspaceListMenu from './OmniboxWorkspaceListMenu'
import ListMenuHeader from '../../../ui/ListMenuHeader'
import Badge from '../../../ui/Badge'

import './OmniboxWorkspace.css'

export interface Props {
  viewContents: boolean
  active: boolean
  search: string
  documentId: DocumentId
  omniboxFinished: Function
  onContent: (url: PushpinUrl) => boolean
}

export default function OmniboxWorkspace(props: Props) {
  const { active, search, documentId, omniboxFinished, viewContents, onContent } = props
  const [workspaceDoc] = useDocument<WorkspaceDoc>(documentId)
  const [selfDoc] = useDocument<ContactDoc>(workspaceDoc ? workspaceDoc.selfId : undefined)
  const repo = useRepo()

  const onClickWorkspace = useCallback(
    () => {
      omniboxFinished()
    },
    [omniboxFinished]
  )

  const onClickWorkspaceCopy = useCallback(
    () => {
      // clipboard.writeText(createDocumentLink('workspace', hypermergeUrl))
    },
    [documentId]
  )

  if (!selfDoc || !workspaceDoc) {
    return null
  }

  const { selfId } = workspaceDoc
  const { name = [] } = selfDoc

  return (
    <div className="OmniboxWorkspace" onClick={onClickWorkspace}>
      <ListMenuHeader>
        <a href={createDocumentLink('workspace', documentId)} className="OmniboxWorkspace-name">
          {name}&apos;s Documents
        </a>
        <div className="OmniboxWorkspace-badge" key="contact">
          <Content context="title-bar" url={createDocumentLink('contact', selfId)} />
        </div>

        <div className="OmniboxWorkspace-badge" key="copy" onClick={onClickWorkspaceCopy}>
          <Badge shape="circle" icon="clipboard" size="large" />
        </div>
      </ListMenuHeader>
      {!viewContents ? null : (
        <OmniboxWorkspaceListMenu
          repo={repo}
          active={active}
          search={search}
          onContent={onContent}
          documentId={documentId}
          omniboxFinished={omniboxFinished}
        />
      )}
    </div>
  )
}
