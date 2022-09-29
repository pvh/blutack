import React from 'react'

import Content from './Content'
import { DocumentId } from 'automerge-repo-react-hooks'
import { useCurrentDeviceUrl, CurrentDeviceContext } from './content-types/workspace/Device'

// We load these modules here so that the content registry will have them.
import './content-types/workspace/Workspace'

// default context components
import './content-types/defaults/DefaultInList'

// board in various contexts
import './content-types/board'
import './content-types/contact'
import './content-types/files'
// import './content-types/storage-peer'

// other single-context components
// import './content-types/TextContent'
import './content-types/ThreadContent'
// import './content-types/UrlContent'
import './content-types/files/ImageContent'
import './content-types/files/AudioContent'
import './content-types/files/VideoContent'
// import './content-types/files/PdfContent'

interface RootArgs {
  documentId: DocumentId
}
export default function Root({ documentId }: RootArgs) {
  const currentDeviceUrl = useCurrentDeviceUrl()

  return (
    <CurrentDeviceContext.Provider value={currentDeviceUrl}>
      <Content
        context="root"
        url={`pushpin:/${documentId}?type=workspace`}
      />
    </CurrentDeviceContext.Provider>
  )
}
