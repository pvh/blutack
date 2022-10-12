import Content from './Content'
import { DocumentId } from 'automerge-repo'
import { CurrentDeviceContext } from './content-types/workspace/Device'
import { createDocumentLink } from './pushpin-code/ShareLink'

// We load these modules here so that the content registry will have them.
import './content-types/workspace/Workspace'

// default context components
import './content-types/defaults/DefaultInList'

// board in various contexts
import './content-types/board'
import './content-types/contact'

// other single-context components
import './content-types/TextContent'
import './content-types/ThreadContent'

import './content-types/ContentList'

import './content-types/Project/index'
import './content-types/Task/index'

import './content-types/files/index'
import './content-types/files/FileContent'
import './content-types/files/ImageContent'
import './content-types/files/PdfContent'
// import './content-types/files/AudioContent'
// import './content-types/files/VideoContent'

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
