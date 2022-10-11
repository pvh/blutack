import * as ContentTypes from "../../pushpin-code/ContentTypes";
import FileContent from "./FileContent";

import * as ContentData from "../../pushpin-code/ContentData";
import { DocumentId, DocHandle } from "automerge-repo";
import { BinaryDataId } from "../../../blobstore/Blob";

export interface FileDoc {
  title: string; // names are editable and not an intrinsic part of the file
  extension: string;
  binaryDataId: BinaryDataId;
  capturedAt: string;
}

function create({ title, extension, binaryDataId }: any, handle: DocHandle<any>) {
  handle.change((doc) => {
    doc.title = title;
    doc.extension = extension;
    doc.binaryDataId = binaryDataId;
  });
}

async function createFrom(
  contentData: ContentData.ContentData,
  handle: DocHandle<FileDoc>
) {
  const name = contentData.name || contentData.src || "Nameless File";
  const binaryDataId = await ContentData.storeContentData(contentData);
  const { capturedAt } = contentData;

  handle.change((doc: FileDoc) => {
    const parsed = { name: "TODO" } // pathParse(name);
    doc.binaryDataId = binaryDataId;
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
