import { Task } from "./Task";
import { PushpinUrl } from "../../pushpin-code/ShareLink";
import { DocHandle } from "automerge-repo";
import * as ContentTypes from "../ContentList";

export interface TaskDoc {
  title: string;
  authors: PushpinUrl[]; // TODO: automatically maintained by host app
  description: string;
  status: string;
  archived: boolean;
  tags: string[];
  assignee: PushpinUrl | null;
}

function create(unusedAttrs: unknown, handle: DocHandle<TaskDoc>) {
  handle.change((doc: TaskDoc) => {
    const newDoc: TaskDoc = {
      title: "",
      description: "",
      status: "todo",
      archived: false,
      tags: [],
      assignee: null,
    };
    Object.assign(doc, newDoc);
  });
}

ContentTypes.register({
  type: "task",
  name: "Task",
  icon: "sticky-note",
  contexts: {
    workspace: Task,
    list: Task,
  },
  create,
});
