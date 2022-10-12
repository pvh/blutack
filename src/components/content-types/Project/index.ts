import * as ContentTypes from "../../pushpin-code/ContentTypes"
import "./Project.css"

// We specify versions in the import path, but give non-versioned names in code.
// To change versions in the future, we only need to change this one spot.
import "../Task" // to include the components

import { ProjectInList } from "./ProjectInList"
import Project from "./Project"
import { DocHandle } from "automerge-repo"

export interface ProjectDoc {
  status: string
  description: string
  name: string
  tasks: unknown[]
  members: unknown[]
  metadata: {
    objective: string
    [k: string]: unknown
  }
}

function create(unusedAttrs: any, handle: DocHandle<any>) {
  const newDoc = {
    name: "",
    description: "",
    status: "todo",
    tasks: [],
    members: [],
    metadata: {
      objective: "",
    },
  } as ProjectDoc

  handle.change((doc: ProjectDoc) => {
    Object.assign(doc, newDoc)
  })
}

ContentTypes.register({
  type: "project",
  name: "Project",
  icon: "list",
  contexts: {
    board: Project,
    workspace: Project,
    list: ProjectInList,
    "title-bar": ProjectInList,
  },
  create,
})
