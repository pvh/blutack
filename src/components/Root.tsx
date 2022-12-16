import Content from "./Content"
import * as ContentTypes from "./pushpin-code/ContentTypes"
import { DocumentId } from "automerge-repo"
import { CurrentDeviceContext } from "./content-types/workspace/Device"
import { ViewStateContext } from "./pushpin-code/ViewState"
import { createDocumentLink } from "./pushpin-code/Url"
import { useUrlParams } from "./pushpin-code/Url"

// Import various content types and register them.
import { workspaceContentType } from "./content-types/workspace/Workspace"
ContentTypes.register(workspaceContentType)

ContentTypes.register((await import("./content-types/board")).contentType)
ContentTypes.register((await import("./content-types/contact")).contentType)
ContentTypes.register((await import("./content-types/TextContent")).contentType)
ContentTypes.register((await import("./content-types/ThreadContent")).contentType)
ContentTypes.register((await import("./content-types/files/index")).contentType)
ContentTypes.register((await import("./content-types/files/ImageContent")).contentType)
ContentTypes.register((await import("./content-types/files/PdfContent")).contentType)
ContentTypes.register((await import("./content-types/files/AudioContent")).contentType)
ContentTypes.register((await import("./content-types/files/VideoContent")).contentType)
ContentTypes.register((await import("./content-types/ContentList")).contentType)
ContentTypes.register((await import("./content-types/workspace/Device")).contentType)

import "./content-types/defaults/DefaultInTitle"
import "./content-types/defaults/DefaultInBadge"

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
