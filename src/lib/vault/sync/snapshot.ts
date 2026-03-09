import { getMeta, setMeta, getAllCredentials, saveCredential, clearAllData } from "../db";
import type { VaultSnapshot, SerializedCredential } from "./types";
import type { EncryptedCredential } from "../types";

// Convert ArrayBuffer/Uint8Array to base64 string
function toBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert base64 string back to Uint8Array
function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

const META_KEYS = [
  "salt",
  "recoverySalt",
  "wrappedMasterKey",
  "wrappedMasterKeyIv",
  "recoveryWrappedKey",
  "recoveryWrappedKeyIv",
  "setupDate",
  "lastRotationCheck",
];

export async function exportSnapshot(): Promise<VaultSnapshot> {
  // Export all meta values
  const meta: Record<string, string> = {};
  for (const key of META_KEYS) {
    const value = await getMeta(key);
    if (value === null || value === undefined) continue;
    if (value instanceof ArrayBuffer) {
      meta[key] = toBase64(value);
    } else if (value instanceof Uint8Array) {
      meta[key] = toBase64(value);
    } else if (typeof value === "string") {
      meta[key] = value;
    } else {
      meta[key] = String(value);
    }
  }

  // Export all encrypted credentials
  const rawCreds = await getAllCredentials();
  const credentials: SerializedCredential[] = rawCreds.map((c) => ({
    id: c.id,
    iv: toBase64(c.iv),
    ciphertext: toBase64(c.ciphertext),
    category: c.category,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));

  const exportedAt = Date.now();
  const hashInput = JSON.stringify({ meta, credentials });
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(hashInput));
  const hash = toBase64(hashBuffer);

  return { version: 1, exportedAt, hash, meta, credentials };
}

export async function importSnapshot(snapshot: VaultSnapshot): Promise<void> {
  await clearAllData();

  // Restore meta values
  const BINARY_META_KEYS = [
    "salt", "recoverySalt", "wrappedMasterKey",
    "wrappedMasterKeyIv", "recoveryWrappedKey", "recoveryWrappedKeyIv",
  ];

  for (const [key, value] of Object.entries(snapshot.meta)) {
    if (BINARY_META_KEYS.includes(key)) {
      // These need to be stored as Uint8Array/ArrayBuffer
      const bytes = fromBase64(value);
      // wrappedMasterKey and recoveryWrappedKey are ArrayBuffer, others are Uint8Array
      if (key === "wrappedMasterKey" || key === "recoveryWrappedKey") {
        await setMeta(key, bytes.buffer);
      } else {
        await setMeta(key, bytes);
      }
    } else {
      await setMeta(key, value);
    }
  }

  // Restore credentials
  for (const sc of snapshot.credentials) {
    const cred: EncryptedCredential = {
      id: sc.id,
      iv: fromBase64(sc.iv),
      ciphertext: fromBase64(sc.ciphertext).buffer as ArrayBuffer,
      category: sc.category,
      createdAt: sc.createdAt,
      updatedAt: sc.updatedAt,
    };
    await saveCredential(cred);
  }
}

export async function computeLocalHash(): Promise<string> {
  const snapshot = await exportSnapshot();
  return snapshot.hash;
}
