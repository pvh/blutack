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

import { boardContentType } from "./content-types/board"
ContentTypes.register(boardContentType)

import { contactContentType } from "./content-types/contact"
ContentTypes.register(contactContentType)

// other single-context components
import { textContentType } from "./content-types/TextContent"
ContentTypes.register(textContentType)

import { threadContentType } from "./content-types/ThreadContent"
ContentTypes.register(threadContentType)

import { fileContentType } from "./content-types/files/index"
ContentTypes.register(fileContentType)

import { imageContentType } from "./content-types/files/ImageContent"
ContentTypes.register(imageContentType)

import { pdfContentType } from "./content-types/files/PdfContent"
ContentTypes.register(pdfContentType)

import { audioContentType } from "./content-types/files/AudioContent"
ContentTypes.register(audioContentType)

import { videoContentType } from "./content-types/files/VideoContent"
ContentTypes.register(videoContentType)

import { listContentType } from "./content-types/ContentList"
ContentTypes.register(listContentType)

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
