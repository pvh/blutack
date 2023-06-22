import Content from "./Content"
import * as ContentTypes from "./pushpin-code/ContentTypes"
import { DocumentId } from "automerge-repo"
import { CurrentDeviceContext } from "./content-types/workspace/Device"

// Import css files
// todo: find solution that allows to add styling from docs
import "../bootstrap/ContentList.css"
import "../bootstrap/TextContent.css"

// todo: actually load files bootstrapped
// Import various content types and register them.
import * as Profile from "../bootstrap/Profile"
ContentTypes.register(Profile.contentType)

import * as ContentList from "../bootstrap/ContentList"
ContentTypes.register(ContentList.contentType)

import * as TextContent from "../bootstrap/TextContent"
ContentTypes.register(TextContent.contentType)

import * as Contact from "../bootstrap/Contact"
import { createDocumentLink } from "./pushpin-code/Url";
ContentTypes.register(Contact.contentType)

/*import * as B from "./content-types/board"
ContentTypes.register(B.contentType)
import * as Contact from "./content-types/contact"
ContentTypes.register(Contact.contentType)
import * as Text from "./content-types/TextContent"
ContentTypes.register(Text.contentType)
import * as Thread from "./content-types/ThreadContent"
ContentTypes.register(Thread.contentType)
import * as File from "./content-types/files/index"
ContentTypes.register(File.contentType)
import * as Image from "./content-types/files/ImageContent"
ContentTypes.register(Image.contentType)
import * as Pdf from "./content-types/files/PdfContent"
ContentTypes.register(Pdf.contentType)
import * as Audio from "./content-types/files/AudioContent"
ContentTypes.register(Audio.contentType)
import * as Video from "./content-types/files/VideoContent"
ContentTypes.register(Video.contentType)
import * as List from "./content-types/ContentList"
ContentTypes.register(List.contentType)
import * as Device from "./content-types/workspace/Device"
ContentTypes.register(Device.contentType)
import * as Widget from "./content-types/Widget"
ContentTypes.register(Widget.contentType)
import * as WidgetEditor from "./content-types/WidgetEditor"
ContentTypes.register(WidgetEditor.contentType)

import * as RawView from "./content-types/RawView"
ContentTypes.register(RawView.contentType)

import "./content-types/defaults/DefaultInTitle"
import "./content-types/defaults/DefaultInBadge" */

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
