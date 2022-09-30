import React from 'react'

import Content from './Content'
import { DocumentId, useDocument } from 'automerge-repo-react-hooks'
import { CurrentDeviceContext } from './content-types/workspace/Device'
import SelfContext from './pushpin-code/SelfHooks'

// We load these modules here so that the content registry will have them.
// import './content-types/workspace/Workspace'

// default context components
// import './content-types/defaults/DefaultInList'

// board in various contexts
// import './content-types/board'
import './content-types/contact'
// import './content-types/files'
// import './content-types/storage-peer'

// other single-context components
// import './content-types/TextContent'
import './content-types/ThreadContent'
import { createDocumentLink, PushpinUrl } from './pushpin-code/ShareLink'
import ThreadContent from './content-types/ThreadContent'
// import './content-types/UrlContent'
// import './content-types/files/ImageContent'
// import './content-types/files/AudioContent'
// import './content-types/files/VideoContent'
// import './content-types/files/PdfContent'

interface RootArgs {
  workspaceDocId: DocumentId
  selfDocId: DocumentId
  deviceDocId: DocumentId
}
export default function Root({ workspaceDocId, selfDocId, deviceDocId }: RootArgs) {
  const selfUrl = createDocumentLink("contact", selfDocId)

  const [doc, change] = useDocument<any>(workspaceDocId)
  if (doc && !doc.messages) { change((d) => d.messages = []) }

  if (!doc || !doc.messages) { return <></> }

  return (
    <SelfContext.Provider value={selfDocId}>
      <CurrentDeviceContext.Provider value={deviceDocId}>
        <Content
          context="workspace"
          url={createDocumentLink('thread', workspaceDocId)}
        />
      </CurrentDeviceContext.Provider>
    </SelfContext.Provider>
  )
  return (
    <SelfContext.Provider value={selfDocId}>
      <CurrentDeviceContext.Provider value={deviceDocId}>
        <Content
          context="root"
          url={`pushpin:/${workspaceDocId}?type=workspace`}
        />
      </CurrentDeviceContext.Provider>
    </SelfContext.Provider>
  )
}
