import * as Automerge from "@automerge/automerge"
import * as ImportData from "./ImportData"
import * as ContentTypes from "./ContentTypes"
import * as Url from "./Url"
import * as WebStreamLogic from "./WebStreamLogic"
import * as Modules from "./Modules"
import * as Context from "./Context"
import * as Searches from "./Searches"
import CodeMirror from "./CodeMirror"

import Content from "./Content"

import { useDocument, useRepo } from "automerge-repo-react-hooks"
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
  CodeMirror,
  Searches,
  useDocument,
  useDocumentIds,
  useStaticCallback,
  useSelfId,
  useRepo,
  usePresence,
}
