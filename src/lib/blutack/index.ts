// PVH note: this should get split out into several modules but i'm holding off since we're using it

import * as Automerge from "@automerge/automerge"
import * as ImportData from "./ddcp/ImportData"
import * as ContentTypes from "../blutack/content/ContentTypes"
import * as Url from "../blutack/content/Url"
import * as WebStreamLogic from "./binary/WebStreamLogic"
import * as Modules from "./Modules"
import * as Context from "./globals/ProfileHooks"
import * as Searches from "./Searches"

// todo: remove once we can share the same instance of react across widgets
import ReactJson from "react-json-view"
import Content from "../blutack/content/Content"

import { useDocument, useRepo } from "@automerge/automerge-repo-react-hooks"
import { useDocumentIds, useStaticCallback } from "./Hooks"
import { useSelfId } from "./globals/SelfHooks"
import { usePresence } from "./presence/PresenceHooks"

export * from "./ddcp/constants"
export {
  ReactJson,
  Automerge,
  ImportData,
  ContentTypes,
  Url,
  WebStreamLogic,
  Content,
  Modules,
  Context,
  Searches,
  useDocument,
  useDocumentIds,
  useStaticCallback,
  useSelfId,
  useRepo,
  usePresence,
}
