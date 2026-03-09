const PBKDF2_ITERATIONS = 600_000;
const AES_KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const RECOVERY_KEY_GROUPS = 8;

function bufferToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

export function generateIv(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

export async function deriveKeyFromPin(
  pin: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: AES_KEY_LENGTH },
    false,
    ["wrapKey", "unwrapKey"]
  );
}

export async function generateMasterKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: AES_KEY_LENGTH },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function wrapKey(
  masterKey: CryptoKey,
  wrappingKey: CryptoKey
): Promise<{ wrapped: ArrayBuffer; iv: Uint8Array }> {
  const iv = generateIv();
  const wrapped = await crypto.subtle.wrapKey("raw", masterKey, wrappingKey, {
    name: "AES-GCM",
    iv: iv as BufferSource,
  });
  return { wrapped, iv };
}

export async function unwrapKey(
  wrappedKey: ArrayBuffer,
  iv: Uint8Array,
  unwrappingKey: CryptoKey
): Promise<CryptoKey> {
  return crypto.subtle.unwrapKey(
    "raw",
    wrappedKey,
    unwrappingKey,
    { name: "AES-GCM", iv: iv as BufferSource },
    { name: "AES-GCM", length: AES_KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

export function generateRecoveryKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(RECOVERY_KEY_GROUPS * 4));
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I,O,0,1 for clarity
  const groups: string[] = [];
  for (let g = 0; g < RECOVERY_KEY_GROUPS; g++) {
    let group = "";
    for (let i = 0; i < 4; i++) {
      group += chars[bytes[g * 4 + i] % chars.length];
    }
    groups.push(group);
  }
  return groups.join("-");
}

export async function deriveKeyFromRecovery(
  recoveryKey: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const normalized = recoveryKey.replace(/-/g, "").toUpperCase();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(normalized),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: AES_KEY_LENGTH },
    false,
    ["wrapKey", "unwrapKey"]
  );
}

export async function encrypt(
  data: string,
  key: CryptoKey
): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> {
  const iv = generateIv();
  const encoded = new TextEncoder().encode(data);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    encoded
  );
  return { ciphertext, iv };
}

export async function decrypt(
  ciphertext: ArrayBuffer,
  iv: Uint8Array,
  key: CryptoKey
): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    ciphertext
  );
  return new TextDecoder().decode(decrypted);
}

export { bufferToHex, hexToBuffer };
