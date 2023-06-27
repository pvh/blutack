import Content from "./lib/blutack-content/Content"
import * as ContentTypes from "./lib/blutack-content/ContentTypes"
import { DocumentId } from "@automerge/automerge-repo"
import { CurrentDeviceContext } from "./lib/blutack/DeviceHooks"
import { createDocumentLink } from "./lib/blutack-content/Url"

// Import css files
// todo: find solution that allows to add styling from docs
import "./styles/ContentList.css"
import "./styles/TextContent.css"

interface RootArgs {
  profileDocId: DocumentId
  deviceDocId: DocumentId
}

export default function Root({ profileDocId, deviceDocId }: RootArgs) {
  return (
    <CurrentDeviceContext.Provider value={deviceDocId}>
      <Content context="root" url={createDocumentLink("profile", profileDocId)} />
    </CurrentDeviceContext.Provider>
  )
}
