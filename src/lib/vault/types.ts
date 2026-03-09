export interface VaultCredential {
  id: string;
  siteName: string;
  siteUrl: string;
  username: string;
  password: string;
  notes: string;
  category: string;
  createdAt: number;
  updatedAt: number;
}

export interface EncryptedCredential {
  id: string;
  iv: Uint8Array;
  ciphertext: ArrayBuffer;
  category: string;
  createdAt: number;
  updatedAt: number;
}

export interface VaultMeta {
  salt: Uint8Array;
  wrappedMasterKey: ArrayBuffer;
  wrappedMasterKeyIv: Uint8Array;
  recoveryWrappedKey: ArrayBuffer;
  recoveryWrappedKeyIv: Uint8Array;
  recoverySalt: Uint8Array;
  setupDate: string;
  lastRotationCheck: string;
}

export type VaultStatus = "uninitialized" | "locked" | "unlocked";

export interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}
