import { Task } from "./Task";
import { PushpinUrl } from "../../pushpin-code/ShareLink";
import { DocHandle } from "automerge-repo";
import * as ContentTypes from "../../pushpin-code/ContentTypes";

export interface TaskDoc {
  title: string;
  authors: PushpinUrl[]; // TODO: automatically maintained by host app
  description: string;
  status: string;
  archived: boolean;
  tags: string[];
  assignee: PushpinUrl | null;
}

function create(unusedAttrs: any, handle: DocHandle<any>) {
  handle.change((doc: TaskDoc) => {
    const newDoc: TaskDoc = {
      title: "",
      description: "",
      status: "todo",
      archived: false,
      tags: [],
      assignee: null,
      authors: []
    };
    Object.assign(doc, newDoc);
  });
}

ContentTypes.register({
  type: "task",
  name: "Task",
  icon: "sticky-note",
  contexts: {
    // workspace: Task,
    list: Task,
    // board: Task,
  },
  create,
});
