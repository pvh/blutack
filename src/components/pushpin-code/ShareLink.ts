import Base58 from "bs58";
import * as url from "url";
import * as querystring from "querystring";
import { DocumentId } from "automerge-repo-react-hooks";

export type PushpinUrl = string & { pushpin: true };

export function isPushpinUrl(str: string): str is PushpinUrl {
  const { protocol, query } = url.parse(str);
  return protocol === "hypermerge:" && /^pushpinContentType=/.test(query || "");
}

export function createDocumentLink(
  type: string,
  docId: DocumentId
): PushpinUrl {
  if (!type) {
    throw new Error("no type when creating URL");
  }
  return `pushpin:/${id}?type=${type}` as PushpinUrl;
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

  const { scheme, type, docId } = parts(link);

  if (scheme !== "pushpin") {
    throw new Error(`Invalid url scheme: ${scheme} (expected pushpin)`);
  }

  if (!type) {
    throw new Error(`Missing type in ${link}`);
  }

  if (!docId) {
    throw new Error(`Missing docId in ${link}`);
  }

  const documentId = `${docId}` as DocumentId;

  return { scheme, type, documentId };
}

export function parts(str: string) {
  const { protocol, pathname, query } = url.parse(str);
  return {
    scheme: protocol ? protocol.substr(0, protocol.length - 1) : "",
    type: querystring.parse(query || "").pushpinContentType.toString(),
    docId: (pathname || "").substr(1),
  };
}

export const encode = (str: string) => Base58.encode(hexToBuffer(str));

export const decode = (str: string) => bufferToHex(Base58.decode(str));

export const hexToBuffer = (key: string | Buffer) =>
  Buffer.isBuffer(key) ? key : Buffer.from(key, "hex");

export const bufferToHex = (key: Buffer | string) =>
  Buffer.isBuffer(key) ? key.toString("hex") : key;
