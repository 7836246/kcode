import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const AES_BLOCK_SIZE = 32;

export class WecomCryptoError extends Error {
  readonly code = "WECOM_CRYPTO";
  constructor(message: string) {
    super(message);
    this.name = "WecomCryptoError";
  }
}

function pkcs7Pad(data: Buffer): Buffer {
  const pad = AES_BLOCK_SIZE - (data.length % AES_BLOCK_SIZE);
  return Buffer.concat([data, Buffer.alloc(pad, pad)]);
}

function pkcs7Unpad(data: Buffer): Buffer {
  const pad = data[data.length - 1];
  if (!pad || pad < 1 || pad > AES_BLOCK_SIZE || pad > data.length) {
    throw new WecomCryptoError("Invalid PKCS7 padding");
  }
  return data.subarray(0, data.length - pad);
}

export function decodeWecomEncodingAesKey(encodingAesKey: string): Buffer {
  const trimmed = encodingAesKey.trim();
  const padded = `${trimmed}${"=".repeat((4 - (trimmed.length % 4)) % 4)}`;
  const decoded = Buffer.from(padded, "base64");
  if (decoded.length !== 32) {
    throw new WecomCryptoError("EncodingAESKey must decode to 32 bytes");
  }
  return decoded;
}

export function computeWecomSignature(
  token: string,
  timestamp: string,
  nonce: string,
  encrypt: string,
): string {
  const material = [token, timestamp, nonce, encrypt].sort().join("");
  return createHash("sha1").update(material, "utf8").digest("hex");
}

export function encryptWecomPlaintext(
  encodingAesKey: string,
  receiveId: string,
  plaintext: string,
): string {
  const key = decodeWecomEncodingAesKey(encodingAesKey);
  const random = randomBytes(16);
  const xml = Buffer.from(plaintext, "utf8");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(xml.length);
  const packed = pkcs7Pad(Buffer.concat([random, length, xml, Buffer.from(receiveId, "utf8")]));
  const cipher = createCipheriv("aes-256-cbc", key, key.subarray(0, 16));
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(packed), cipher.final()]).toString("base64");
}

export function decryptWecomCiphertext(
  encodingAesKey: string,
  receiveId: string,
  ciphertext: string,
): string {
  const key = decodeWecomEncodingAesKey(encodingAesKey);
  const decipher = createDecipheriv("aes-256-cbc", key, key.subarray(0, 16));
  decipher.setAutoPadding(false);
  const decrypted = pkcs7Unpad(
    Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]),
  );
  if (decrypted.length < 20) {
    throw new WecomCryptoError("Decrypted payload is too short");
  }
  const xmlLength = decrypted.readUInt32BE(16);
  const xmlStart = 20;
  const xmlEnd = xmlStart + xmlLength;
  if (xmlEnd > decrypted.length) {
    throw new WecomCryptoError("Decrypted payload length is invalid");
  }
  const xml = decrypted.subarray(xmlStart, xmlEnd).toString("utf8");
  const actualReceiveId = decrypted.subarray(xmlEnd).toString("utf8");
  if (actualReceiveId !== receiveId) {
    throw new WecomCryptoError("Corp ID mismatch after decrypt");
  }
  return xml;
}

export function readWecomXmlCdata(xml: string, tag: string): string {
  const cdata = xml.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, "u"));
  if (cdata?.[1] !== undefined) {
    return cdata[1];
  }
  const plain = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "u"));
  return plain?.[1]?.trim() ?? "";
}
