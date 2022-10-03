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
  return `/${type}/${docId}` as PushpinUrl;
}

interface Parts {
  type: string;
  documentId: DocumentId;
}

export function parseDocumentLink(link: string): Parts {
  if (!link) {
    throw new Error("Cannot parse an empty value as a link.");
  }

  const { type, documentId } = parts(link);

  if (!type) {
    throw new Error(`Missing type in ${link}`);
  }

  if (!documentId) {
    throw new Error(`Missing docId in ${link}`);
  }

  return { type, documentId };
}

export function parts(str: string): Parts {
  const url = new URL(str, document.URL);

  const [, /* leading */ type, documentId] = url.pathname.split("/");

  const params = new URLSearchParams(url.search);
  return { type, documentId: documentId as DocumentId };
}
