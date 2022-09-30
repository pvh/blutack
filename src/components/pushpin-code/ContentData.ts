import { DocumentId } from "automerge-repo-react-hooks";
import mime from "mime-types";
import { FileId } from "../content-types/files";
import * as WebStreamLogic from "./WebStreamLogic";

export type FileUrl = string & { __fileUrl: false };

export interface ContentData {
  mimeType: string;
  data: ReadableStream<Uint8Array>;
  src?: string;
  name?: string;
  extension?: string;
  capturedAt?: string; // Date().toISOString()
}

export function fromFile(file: File) {
  return {
    name: file.name,
    mimeType: mime.contentType(file.type) || "application/octet-stream",
    data: file.stream(),
  };
}

export function fromString(str: string, mimeType: string = "text/plain") {
  return {
    mimeType,
    data: WebStreamLogic.fromString(str),
  };
}

export async function toFileId(contentData: ContentData): Promise<FileId> {
  // const header = await Hyperfile.write(contentData.data, contentData.mimeType);
  // return header.url;
  return "a file identifer" as FileId;
}
