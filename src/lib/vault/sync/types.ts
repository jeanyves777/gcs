export interface CloudSyncConfig {
  provider: "google-drive";
  enabled: boolean;
  autoSync: boolean;
  lastSyncAt: number | null;
  lastSyncHash: string | null;
  connectedEmail: string | null;
}

export interface VaultSnapshot {
  version: 1;
  exportedAt: number;
  hash: string;
  meta: Record<string, string>; // base64-encoded values
  credentials: SerializedCredential[];
}

export interface SerializedCredential {
  id: string;
  iv: string; // base64
  ciphertext: string; // base64
  category: string;
  createdAt: number;
  updatedAt: number;
}
