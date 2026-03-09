"use client";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { getMeta, setMeta } from "../db";
import { exportSnapshot, importSnapshot, computeLocalHash } from "./snapshot";
import * as gdrive from "./google-drive";
import type { CloudSyncConfig } from "./types";

interface SyncContextType {
  config: CloudSyncConfig | null;
  syncStatus: "idle" | "syncing" | "error" | "success";
  lastError: string | null;
  connectGoogleDrive: () => Promise<boolean>; // returns true if cloud backup exists
  disconnectCloud: () => Promise<void>;
  syncNow: () => Promise<void>;
  toggleAutoSync: (enabled: boolean) => Promise<void>;
  restoreFromCloud: () => Promise<void>;
  hasCloudBackup: boolean;
}

const SyncContext = createContext<SyncContextType | null>(null);

const SYNC_CONFIG_KEY = "cloudSyncConfig";

export function SyncProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<CloudSyncConfig | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "error" | "success">("idle");
  const [lastError, setLastError] = useState<string | null>(null);
  const [hasCloudBackup, setHasCloudBackup] = useState(false);

  // Load config + preload Google script on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    gdrive.preloadGisScript();
    getMeta(SYNC_CONFIG_KEY).then((raw) => {
      if (raw && typeof raw === "object") {
        setConfig(raw as CloudSyncConfig);
      }
    }).catch(() => {});
  }, []);

  const saveConfig = useCallback(async (cfg: CloudSyncConfig | null) => {
    setConfig(cfg);
    if (cfg) {
      await setMeta(SYNC_CONFIG_KEY, cfg);
    } else {
      await setMeta(SYNC_CONFIG_KEY, null);
    }
  }, []);

  const connectGoogleDrive = useCallback(async (): Promise<boolean> => {
    setLastError(null);
    try {
      const { email } = await gdrive.connect();
      const cfg: CloudSyncConfig = {
        provider: "google-drive",
        enabled: true,
        autoSync: false,
        lastSyncAt: null,
        lastSyncHash: null,
        connectedEmail: email,
      };
      await saveConfig(cfg);

      // Check if there's an existing backup
      const remote = await gdrive.download();
      const exists = !!remote;
      setHasCloudBackup(exists);
      return exists;
    } catch (err: any) {
      setLastError(err.message || "Failed to connect");
      throw err;
    }
  }, [saveConfig]);

  const disconnectCloud = useCallback(async () => {
    gdrive.disconnect();
    await saveConfig(null);
    setHasCloudBackup(false);
    setSyncStatus("idle");
    setLastError(null);
  }, [saveConfig]);

  const syncNow = useCallback(async () => {
    if (!config?.enabled) return;
    setSyncStatus("syncing");
    setLastError(null);

    try {
      // Reconnect if token expired
      if (!gdrive.isConnected()) {
        await gdrive.connect();
      }

      const snapshot = await exportSnapshot();
      await gdrive.upload(snapshot);

      const updated: CloudSyncConfig = {
        ...config,
        lastSyncAt: Date.now(),
        lastSyncHash: snapshot.hash,
      };
      await saveConfig(updated);
      setSyncStatus("success");
      setTimeout(() => setSyncStatus("idle"), 3000);
    } catch (err: any) {
      setLastError(err.message || "Sync failed");
      setSyncStatus("error");
    }
  }, [config, saveConfig]);

  const restoreFromCloud = useCallback(async () => {
    setSyncStatus("syncing");
    setLastError(null);
    try {
      if (!gdrive.isConnected()) {
        await gdrive.connect();
      }
      const remote = await gdrive.download();
      if (!remote) throw new Error("No backup found in Google Drive");
      await importSnapshot(remote);

      const cfg: CloudSyncConfig = {
        provider: "google-drive",
        enabled: true,
        autoSync: config?.autoSync ?? false,
        lastSyncAt: Date.now(),
        lastSyncHash: remote.hash,
        connectedEmail: config?.connectedEmail ?? null,
      };
      await saveConfig(cfg);
      setSyncStatus("success");
      // Reload the page to pick up restored data
      window.location.reload();
    } catch (err: any) {
      setLastError(err.message || "Restore failed");
      setSyncStatus("error");
    }
  }, [config, saveConfig]);

  const toggleAutoSync = useCallback(async (enabled: boolean) => {
    if (!config) return;
    await saveConfig({ ...config, autoSync: enabled });
  }, [config, saveConfig]);

  return (
    <SyncContext.Provider
      value={{
        config,
        syncStatus,
        lastError,
        connectGoogleDrive,
        disconnectCloud,
        syncNow,
        toggleAutoSync,
        restoreFromCloud,
        hasCloudBackup,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useSync must be used within SyncProvider");
  return ctx;
}
