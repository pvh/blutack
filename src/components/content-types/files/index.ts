import path from "path";
import * as ContentTypes from "../../pushpin-code/ContentTypes";
import FileContent from "./FileContent";

import * as ContentData from "../../pushpin-code/ContentData";
import { DocHandle } from "automerge-repo";
import { DocumentId } from "automerge-repo-react-hooks";

export type FileId = string & { __fileId: true };
export interface FileDoc {
  title: string; // names are editable and not an intrinsic part of the file
  extension: string;
  fileId: FileId;
  capturedAt: string;
}

// TODO: when is this ever called?
function create({ title, extension, fileId }: any, handle: DocHandle<any>) {
  handle.change((doc) => {
    doc.title = title;
    doc.extension = extension;
    doc.fileId = fileId;
  });
}

async function createFrom(
  contentData: ContentData.ContentData,
  handle: DocHandle<FileDoc>
) {
  const name = contentData.name || contentData.src || "Nameless File";
  const fileId = await ContentData.toFileId(contentData);
  const { capturedAt } = contentData;

  handle.change((doc: FileDoc) => {
    const parsed = path.parse(name);
    doc.fileId = fileId;
    doc.title = parsed.name;
    doc.extension = parsed.ext.slice(1);
    if (capturedAt) {
      doc.capturedAt = capturedAt;
    }
  });
}

ContentTypes.register({
  type: "file",
  name: "File",
  icon: "file-o",
  unlisted: true,
  contexts: {
    workspace: FileContent,
    board: FileContent,
    list: FileContent,
    "title-bar": FileContent,
  },
  create,
  createFrom,
});
