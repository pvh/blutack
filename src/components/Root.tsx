import React from 'react'

import Content from './Content'
import { DocumentId, useDocument } from 'automerge-repo-react-hooks'
import { CurrentDeviceContext } from './content-types/workspace/Device'
import SelfContext from './pushpin-code/SelfHooks'
import { createDocumentLink } from './pushpin-code/ShareLink'
import * as ContentTypes from './pushpin-code/ContentTypes'

// We load these modules here so that the content registry will have them.
import './content-types/workspace/Workspace'

// default context components
import './content-types/defaults/DefaultInList'

// board in various contexts
// import './content-types/board'
import './content-types/contact'
// import './content-types/files'
// import './content-types/storage-peer'

// other single-context components
// import './content-types/TextContent'
import './content-types/ThreadContent'
// import './content-types/UrlContent'
// import './content-types/files/ImageContent'
// import './content-types/files/AudioContent'
// import './content-types/files/VideoContent'
// import './content-types/files/PdfContent'

interface RootArgs {
  workspaceDocId: DocumentId
  deviceDocId: DocumentId
}
export default function Root({ workspaceDocId, deviceDocId }: RootArgs) {
  return (
      <CurrentDeviceContext.Provider value={deviceDocId}>
        <Content
          context="root"
          url={createDocumentLink('workspace', workspaceDocId)}
        />
      </CurrentDeviceContext.Provider>
  )
}
