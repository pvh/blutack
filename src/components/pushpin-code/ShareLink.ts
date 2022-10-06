import { DocumentId } from "automerge-repo";

export type PushpinUrl = string & { pushpin: true };

export function isPushpinUrl(str?: string | null): str is PushpinUrl {
  if (!str) {
    return false;
  }
  const { scheme, type, documentId } = parts(str);
  return (
    scheme === "web+pushpin" && type !== undefined && documentId !== undefined
  );
}

export function createDocumentLink(
  type: string,
  docId: DocumentId
): PushpinUrl {
  if (!type) {
    throw new Error("no type when creating URL");
  }
  return `web+pushpin://${type}/${docId}` as PushpinUrl;
}

export function createWebLink(
  windowLocation: Location,
  pushPinUrl: PushpinUrl
) {
  var url = windowLocation.href.split("?")[0];
  return `${url}?document=${encodeURIComponent(pushPinUrl)}`;
}

// const url = "?document=web%2Bpushpin%3A%2F%2Fcontentlist%2Ffcfb63f5-777e-469b-a9bd-9f093d1ba2b7"
// const url = "web+pushpin://contentlist/fcfb63f5-777e-469b-a9bd-9f093d1ba2b7"
// isPushpinUrl(url) === true

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

  if (scheme !== "web+pushpin") {
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

  const scheme = url.protocol.slice(0, -1);
  const [, , type, documentId] = url.pathname.split("/");

  const params = new URLSearchParams(url.search);
  return { scheme, type, documentId };
}
