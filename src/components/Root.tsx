import Content from "../lib/blutack/Content"
import * as ContentTypes from "../lib/blutack/ContentTypes"
import { DocumentId } from "automerge-repo"
import { CurrentDeviceContext } from "./content-types/workspace/Device"
import { createDocumentLink } from "../lib/blutack/Url";

// Import css files
// todo: find solution that allows to add styling from docs
import "../bootstrap/ContentList.css"
import "../bootstrap/TextContent.css"

// required to create profile
import * as Profile from "../bootstrap/Profile"
ContentTypes.register(Profile.contentType)
import * as ContentList from "../bootstrap/ContentList"
ContentTypes.register(ContentList.contentType)
import * as Contact from "../bootstrap/Contact"
ContentTypes.register(Contact.contentType)

// could not bootstrap yet because it depends on babel
import * as Editor from "../bootstrap/Editor"
ContentTypes.register(Editor.contentType)

/*
import * as TextContent from "../bootstrap/TextContent"
ContentTypes.register(TextContent.contentType)
*/

/*
import * as RawView from "../bootstrap/RawView"
ContentTypes.register(RawView.contentType)
 */

import * as Widget from "../bootstrap/Widget"
ContentTypes.register(Widget.contentType)

interface RootArgs {
  profileDocId: DocumentId
  deviceDocId: DocumentId
}

export default function Root({ profileDocId, deviceDocId }: RootArgs) {
  return (
      <CurrentDeviceContext.Provider value={deviceDocId}>
        <Content
          context="root"
          url={createDocumentLink("profile", profileDocId)}
        />
      </CurrentDeviceContext.Provider>
  )
}
