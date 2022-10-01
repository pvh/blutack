import { DocumentId } from "automerge-repo-react-hooks";

export type PushpinUrl = string & { pushpin: true };

export function isPushpinUrl(str: string): str is PushpinUrl {
  const url = new URL(str, document.URL);
  const { scheme, type, documentId } = parts(str);
  return scheme === "pushpin" && type !== undefined;
}

export function createDocumentLink(
  type: string,
  docId: DocumentId
): PushpinUrl {
  if (!type) {
    throw new Error("no type when creating URL");
  }
  return `pushpin/${type}/${docId}` as PushpinUrl;
}

interface Parts {
  scheme: string;
  type: string;
  documentId: DocumentId;
}

export function parseDocumentLink(link: string): Parts {
  if (!link) {
    throw new Error("Cannot parse an empty value as a link.");
  }

  const { scheme, type, documentId } = parts(link);

  if (scheme !== "pushpin") {
    throw new Error(`Invalid url scheme: ${scheme} (expected pushpin)`);
  }

  if (!type) {
    throw new Error(`Missing type in ${link}`);
  }

  if (!documentId) {
    throw new Error(`Missing docId in ${link}`);
  }

  return { scheme, type, documentId };
}

export function parts(str: string) {
  console.log(str);
  const url = new URL(str, document.URL);

  const [, /* leading */ scheme, type, documentId] = url.pathname.split("/");

  const params = new URLSearchParams(url.search);
  return { scheme, type, documentId: documentId as DocumentId };
}
