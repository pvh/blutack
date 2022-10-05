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
  active: boolean
  search: string
  documentId: DocumentId
  omniboxFinished: Function
  onContent: (url: PushpinUrl) => boolean
}

export default function OmniboxWorkspace(props: Props) {
  const { active, search, documentId, omniboxFinished, onContent } = props
  const [workspaceDoc] = useDocument<WorkspaceDoc>(documentId)
  const repo = useRepo()

  const onClickWorkspace = useCallback(
    () => {
      omniboxFinished()
    },
    [omniboxFinished]
  )

  if (!workspaceDoc) {
    return null
  }

  return (
    <div className="OmniboxWorkspace" onClick={onClickWorkspace}>
        <OmniboxWorkspaceListMenu
          repo={repo}
          active={active}
          search={search}
          onContent={onContent}
          documentId={documentId}
          omniboxFinished={omniboxFinished}
        />
    </div>
  )
}
