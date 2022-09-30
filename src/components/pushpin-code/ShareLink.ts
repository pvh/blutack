import Base58 from "bs58";
import { DocumentId } from "automerge-repo-react-hooks";

export type PushpinUrl = string & { pushpin: true };

export function isPushpinUrl(str: string): str is PushpinUrl {
  const url = new URL(str);
  const protocol = url.protocol;
  const query = url.search;
  return protocol === "pushpin:" && /^type=/.test(query || "");
}

export function createDocumentLink(
  type: string,
  docId: DocumentId
): PushpinUrl {
  if (!type) {
    throw new Error("no type when creating URL");
  }
  return `pushpin:/${docId}?type=${type}` as PushpinUrl;
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
  const url = new URL(str);

  const protocol = url.protocol;
  const scheme = protocol ? protocol.substr(0, protocol.length - 1) : "";
  const documentId = (url.pathname || "").substr(1) as DocumentId;

  const params = new URLSearchParams(url.search);
  const type = params.get("type");
  return { scheme, type, documentId };
}

export const encode = (str: string) => Base58.encode(hexToBuffer(str));

export const decode = (str: string) => bufferToHex(Base58.decode(str));

export const hexToBuffer = (key: string | Buffer) =>
  Buffer.isBuffer(key) ? key : Buffer.from(key, "hex");

export const bufferToHex = (key: Buffer | string) =>
  Buffer.isBuffer(key) ? key.toString("hex") : key;
