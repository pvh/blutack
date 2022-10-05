import { DocumentId } from "automerge-repo";

export type PushpinUrl = string & { pushpin: true };

export function isPushpinUrl(str: string): str is PushpinUrl {
  const url = new URL(str, document.URL);
  const { type, documentId } = parts(str);
  return type !== undefined && documentId !== undefined;
}

export function createDocumentLink(
  type: string,
  docId: DocumentId
): PushpinUrl {
  if (!type) {
    throw new Error("no type when creating URL");
  }
  return `?scheme=pushpin&type=${type}&documentId=${docId}` as PushpinUrl;
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
    throw new Error(`Missing the pushpin scheme in ${link}`);
  }

  if (!type) {
    throw new Error(`Missing type in ${link}`);
  }

  if (!documentId === undefined) {
    throw new Error(`Missing docId in ${link}`);
  }

  return { scheme, type, documentId: documentId as DocumentId };
}

export function parts(str: string) {
  const url = new URL(str, document.URL);

  const scheme = url.searchParams.get("scheme");
  const type = url.searchParams.get("type");
  const documentId = url.searchParams.get("documentId");

  const params = new URLSearchParams(url.search);
  return { scheme, type, documentId };
}
