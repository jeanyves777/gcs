"use client";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import {
  deriveKeyFromPin,
  deriveKeyFromRecovery,
  generateMasterKey,
  generateRecoveryKey,
  generateSalt,
  wrapKey,
  unwrapKey,
  encrypt,
  decrypt,
} from "./crypto";
import {
  getMeta,
  setMeta,
  isVaultInitialized,
  getAllCredentials,
  saveCredential,
  deleteCredential as dbDeleteCredential,
  getCredential,
  clearAllData,
} from "./db";
import type {
  VaultCredential,
  VaultStatus,
  EncryptedCredential,
} from "./types";

const AUTO_LOCK_MS = 5 * 60 * 1000; // 5 minutes

interface VaultContextType {
  status: VaultStatus;
  credentials: VaultCredential[];
  loading: boolean;
  error: string | null;
  setupVault: (pin: string) => Promise<string>; // returns recovery key
  unlockVault: (pin: string) => Promise<void>;
  lockVault: () => void;
  resetWithRecovery: (recoveryKey: string, newPin: string) => Promise<void>;
  addCredential: (cred: Omit<VaultCredential, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateCredential: (id: string, cred: Partial<VaultCredential>) => Promise<void>;
  removeCredential: (id: string) => Promise<void>;
  getDecryptedCredential: (id: string) => Promise<VaultCredential | null>;
  resetVault: () => Promise<void>;
  staleCredentials: VaultCredential[];
}

const VaultContext = createContext<VaultContextType | null>(null);

export function VaultProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<VaultStatus>("locked");
  const [credentials, setCredentials] = useState<VaultCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const masterKeyRef = useRef<CryptoKey | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check vault status on mount (guard against SSR — no indexedDB on server)
  useEffect(() => {
    if (typeof window === "undefined" || typeof indexedDB === "undefined") {
      setLoading(false);
      return;
    }
    isVaultInitialized().then((init) => {
      setStatus(init ? "locked" : "uninitialized");
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  // Auto-lock on inactivity
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (masterKeyRef.current) {
      timerRef.current = setTimeout(() => {
        masterKeyRef.current = null;
        setStatus("locked");
        setCredentials([]);
      }, AUTO_LOCK_MS);
    }
  }, []);

  useEffect(() => {
    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    return () => events.forEach((e) => window.removeEventListener(e, resetTimer));
  }, [resetTimer]);

  // Auto-lock on visibility change
  useEffect(() => {
    const handler = () => {
      if (document.hidden && masterKeyRef.current) {
        setTimeout(() => {
          if (document.hidden && masterKeyRef.current) {
            masterKeyRef.current = null;
            setStatus("locked");
            setCredentials([]);
          }
        }, 30_000);
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  const loadCredentials = useCallback(async (key: CryptoKey) => {
    const encrypted = await getAllCredentials();
    const decrypted: VaultCredential[] = [];
    for (const enc of encrypted) {
      try {
        const json = await decrypt(enc.ciphertext, enc.iv, key);
        const data = JSON.parse(json);
        decrypted.push({
          ...data,
          id: enc.id,
          category: enc.category,
          createdAt: enc.createdAt,
          updatedAt: enc.updatedAt,
        });
      } catch {
        // skip corrupted entries
      }
    }
    decrypted.sort((a, b) => b.updatedAt - a.updatedAt);
    setCredentials(decrypted);
  }, []);

  const setupVault = useCallback(async (pin: string): Promise<string> => {
    setError(null);
    const salt = generateSalt();
    const recoverySalt = generateSalt();
    const recoveryKey = generateRecoveryKey();

    const masterKey = await generateMasterKey();
    const pinKey = await deriveKeyFromPin(pin, salt);
    const recoveryDerivedKey = await deriveKeyFromRecovery(recoveryKey, recoverySalt);

    const pinWrapped = await wrapKey(masterKey, pinKey);
    const recoveryWrapped = await wrapKey(masterKey, recoveryDerivedKey);

    await setMeta("salt", salt);
    await setMeta("recoverySalt", recoverySalt);
    await setMeta("wrappedMasterKey", pinWrapped.wrapped);
    await setMeta("wrappedMasterKeyIv", pinWrapped.iv);
    await setMeta("recoveryWrappedKey", recoveryWrapped.wrapped);
    await setMeta("recoveryWrappedKeyIv", recoveryWrapped.iv);
    await setMeta("setupDate", new Date().toISOString());
    await setMeta("lastRotationCheck", new Date().toISOString());

    masterKeyRef.current = masterKey;
    setStatus("unlocked");
    resetTimer();
    return recoveryKey;
  }, [resetTimer]);

  const unlockVault = useCallback(async (pin: string) => {
    setError(null);
    try {
      const salt = (await getMeta("salt")) as Uint8Array;
      const wrapped = (await getMeta("wrappedMasterKey")) as ArrayBuffer;
      const iv = (await getMeta("wrappedMasterKeyIv")) as Uint8Array;

      const pinKey = await deriveKeyFromPin(pin, salt);
      const masterKey = await unwrapKey(wrapped, iv, pinKey);

      masterKeyRef.current = masterKey;
      setStatus("unlocked");
      resetTimer();
      await loadCredentials(masterKey);
    } catch {
      setError("Incorrect PIN. Please try again.");
      throw new Error("Incorrect PIN");
    }
  }, [resetTimer, loadCredentials]);

  const lockVault = useCallback(() => {
    masterKeyRef.current = null;
    setStatus("locked");
    setCredentials([]);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const resetWithRecovery = useCallback(
    async (recoveryKey: string, newPin: string) => {
      setError(null);
      try {
        const salt = (await getMeta("salt")) as Uint8Array;
        const recoverySalt = (await getMeta("recoverySalt")) as Uint8Array;
        const recoveryWrapped = (await getMeta("recoveryWrappedKey")) as ArrayBuffer;
        const recoveryIv = (await getMeta("recoveryWrappedKeyIv")) as Uint8Array;

        const recoveryDerivedKey = await deriveKeyFromRecovery(recoveryKey, recoverySalt);
        const masterKey = await unwrapKey(recoveryWrapped, recoveryIv, recoveryDerivedKey);

        // Re-wrap with new PIN
        const newPinKey = await deriveKeyFromPin(newPin, salt);
        const newWrapped = await wrapKey(masterKey, newPinKey);
        await setMeta("wrappedMasterKey", newWrapped.wrapped);
        await setMeta("wrappedMasterKeyIv", newWrapped.iv);

        masterKeyRef.current = masterKey;
        setStatus("unlocked");
        resetTimer();
        await loadCredentials(masterKey);
      } catch {
        setError("Invalid recovery key. Please check and try again.");
        throw new Error("Invalid recovery key");
      }
    },
    [resetTimer, loadCredentials]
  );

  const addCredential = useCallback(
    async (cred: Omit<VaultCredential, "id" | "createdAt" | "updatedAt">) => {
      if (!masterKeyRef.current) throw new Error("Vault is locked");
      const now = Date.now();
      const id = crypto.randomUUID();
      const data = JSON.stringify(cred);
      const { ciphertext, iv } = await encrypt(data, masterKeyRef.current);

      const encrypted: EncryptedCredential = {
        id,
        iv,
        ciphertext,
        category: cred.category || "general",
        createdAt: now,
        updatedAt: now,
      };
      await saveCredential(encrypted);
      await loadCredentials(masterKeyRef.current);
    },
    [loadCredentials]
  );

  const updateCredential = useCallback(
    async (id: string, updates: Partial<VaultCredential>) => {
      if (!masterKeyRef.current) throw new Error("Vault is locked");
      const existing = await getCredential(id);
      if (!existing) return;

      const json = await decrypt(existing.ciphertext, existing.iv, masterKeyRef.current);
      const data = { ...JSON.parse(json), ...updates };
      const { ciphertext, iv } = await encrypt(JSON.stringify(data), masterKeyRef.current);

      const updated: EncryptedCredential = {
        ...existing,
        iv,
        ciphertext,
        category: updates.category || existing.category,
        updatedAt: Date.now(),
      };
      await saveCredential(updated);
      await loadCredentials(masterKeyRef.current);
    },
    [loadCredentials]
  );

  const removeCredential = useCallback(
    async (id: string) => {
      await dbDeleteCredential(id);
      if (masterKeyRef.current) await loadCredentials(masterKeyRef.current);
    },
    [loadCredentials]
  );

  const getDecryptedCredential = useCallback(
    async (id: string): Promise<VaultCredential | null> => {
      if (!masterKeyRef.current) return null;
      const enc = await getCredential(id);
      if (!enc) return null;
      try {
        const json = await decrypt(enc.ciphertext, enc.iv, masterKeyRef.current);
        const data = JSON.parse(json);
        return { ...data, id: enc.id, category: enc.category, createdAt: enc.createdAt, updatedAt: enc.updatedAt };
      } catch {
        return null;
      }
    },
    []
  );

  const resetVault = useCallback(async () => {
    await clearAllData();
    masterKeyRef.current = null;
    setStatus("uninitialized");
    setCredentials([]);
  }, []);

  const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;
  const staleCredentials = credentials.filter(
    (c) => Date.now() - c.updatedAt > NINETY_DAYS
  );

  return (
    <VaultContext.Provider
      value={{
        status,
        credentials,
        loading,
        error,
        setupVault,
        unlockVault,
        lockVault,
        resetWithRecovery,
        addCredential,
        updateCredential,
        removeCredential,
        getDecryptedCredential,
        resetVault,
        staleCredentials,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within VaultProvider");
  return ctx;
}
