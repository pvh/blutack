import Content from "./Content"
import { DocumentId } from "automerge-repo"
import { CurrentDeviceContext } from "./content-types/workspace/Device"
import { ViewStateContext } from "./pushpin-code/ViewState"
import { createDocumentLink } from "./pushpin-code/ShareLink"

// board in various contexts
import "./content-types/board"
import "./content-types/contact"

// other single-context components
import "./content-types/TextContent"
import "./content-types/ThreadContent"

import "./content-types/ContentList"

import "./content-types/files/index"
import "./content-types/files/FileContent"
import "./content-types/files/ImageContent"
import "./content-types/files/PdfContent"
import "./content-types/files/AudioContent"
import "./content-types/files/VideoContent"

import "./content-types/TopicList"
import "./content-types/TodoList"
import { useUrlParams } from "./Url"

interface RootArgs {
  workspaceDocId: DocumentId
  deviceDocId: DocumentId
}

export default function Root({ workspaceDocId, deviceDocId }: RootArgs) {
  const { currentDocUrl, viewState } = useUrlParams()

  return (
    <ViewStateContext.Provider value={viewState}>
      <CurrentDeviceContext.Provider value={deviceDocId}>
        <Content
          context="root"
          currentDocUrl={currentDocUrl}
          url={createDocumentLink("workspace", workspaceDocId)}
        />
      </CurrentDeviceContext.Provider>
    </ViewStateContext.Provider>
  )
}
