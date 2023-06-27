import Content from "./lib/blutack/Content"
import * as ContentTypes from "./lib/blutack/ContentTypes"
import { DocumentId } from "automerge-repo"
import { CurrentDeviceContext } from "./lib/blutack/DeviceHooks"
import { createDocumentLink } from "./lib/blutack/Url"

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
