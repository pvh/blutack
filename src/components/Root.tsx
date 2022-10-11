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
import React from "react";
import { fileDialog } from 'file-select-dialog'
import { storeBinary } from "../binary-store";


interface RootArgs {
  workspaceDocId: DocumentId
  deviceDocId: DocumentId
}

export default function Root({ workspaceDocId, deviceDocId }: RootArgs) {

  const pickFile = async () => {
    const files = await fileDialog()
    const binary = await files[0].arrayBuffer()

    storeBinary("avatar.png", binary, files[0].type)
  }

  return (
      <CurrentDeviceContext.Provider value={deviceDocId}>

        <div style={{position: "absolute", top: 60, right: 10, zIndex: 1000}}>
          <button onClick={() => pickFile()}>pick avatar</button>
        </div>
        <Content
          context="root"
          url={createDocumentLink('workspace', workspaceDocId)}
        />
      </CurrentDeviceContext.Provider>
  )
}
