import * as Automerge from "@automerge/automerge"
import * as ImportData from "./ImportData"
import * as ContentTypes from "../blutack-content/ContentTypes"
import * as Url from "../blutack-content/Url"
import * as WebStreamLogic from "./WebStreamLogic"
import * as Modules from "./Modules"
import * as Context from "./Context"
import * as Searches from "./Searches"

import Content from "../blutack-content/Content"

import { useDocument, useRepo } from "@automerge/automerge-repo-react-hooks"
import { useDocumentIds, useStaticCallback } from "./Hooks"
import { useSelfId } from "./SelfHooks"
import { usePresence } from "./PresenceHooks"

export * from "./constants"
export {
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
