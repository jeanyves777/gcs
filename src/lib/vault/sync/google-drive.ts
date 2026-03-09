import type { VaultSnapshot } from "./types";

const SCOPES = "https://www.googleapis.com/auth/drive.appdata";
const VAULT_FILENAME = "gcs-vault.json";

let accessToken: string | null = null;
let tokenExpiry = 0;
let gisPromise: Promise<void> | null = null;

// Load GIS script, returns a promise. Safe to call multiple times.
function ensureGisLoaded(): Promise<void> {
  if (gisPromise) return gisPromise;

  if (typeof document === "undefined") {
    return Promise.reject(new Error("Cannot load scripts during SSR"));
  }

  // Already loaded (e.g. by a previous page visit)
  if ((window as any).google?.accounts?.oauth2) {
    gisPromise = Promise.resolve();
    return gisPromise;
  }

  gisPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("gis-script");
    if (existing) {
      // Script tag exists but hasn't loaded yet — wait for it
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Identity Services")));
      // In case it already loaded between our check and adding the listener
      if ((window as any).google?.accounts?.oauth2) resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = "gis-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(script);
  });

  return gisPromise;
}

// Preload — fire and forget (call on mount so script starts downloading early)
export function preloadGisScript(): void {
  ensureGisLoaded().catch(() => {});
}

function getClientId(): string {
  const id = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID;
  if (!id) throw new Error("Google Drive Client ID not configured. Set NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID.");
  return id;
}

export function isConnected(): boolean {
  return !!accessToken && Date.now() < tokenExpiry;
}

export async function connect(): Promise<{ email: string }> {
  // Wait for GIS script to load (should be fast if preloaded)
  await ensureGisLoaded();

  if (!(window as any).google?.accounts?.oauth2) {
    throw new Error("Google Identity Services failed to initialize. Please refresh.");
  }

  return new Promise((resolve, reject) => {
    const client = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: getClientId(),
      scope: SCOPES,
      callback: (response: any) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }
        accessToken = response.access_token;
        tokenExpiry = Date.now() + (response.expires_in || 3600) * 1000;

        // Get user email
        fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
          .then((r) => r.json())
          .then((info) => resolve({ email: info.email || "Connected" }))
          .catch(() => resolve({ email: "Connected" }));
      },
      error_callback: (err: any) => {
        reject(new Error(err?.message || "OAuth popup was closed or blocked"));
      },
    });
    client.requestAccessToken();
  });
}

export function disconnect(): void {
  if (accessToken) {
    (window as any).google?.accounts?.oauth2?.revoke?.(accessToken);
  }
  accessToken = null;
  tokenExpiry = 0;
}

async function findVaultFile(): Promise<string | null> {
  if (!accessToken) throw new Error("Not connected to Google Drive");

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${VAULT_FILENAME}'&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Drive list failed: ${res.status}`);
  const data = await res.json();
  return data.files?.[0]?.id || null;
}

export async function upload(snapshot: VaultSnapshot): Promise<void> {
  if (!accessToken) throw new Error("Not connected to Google Drive");

  const content = JSON.stringify(snapshot);
  const existingId = await findVaultFile();

  if (existingId) {
    // Update existing file
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=media`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: content,
      }
    );
    if (!res.ok) throw new Error(`Drive update failed: ${res.status}`);
  } else {
    // Create new file in appDataFolder
    const metadata = { name: VAULT_FILENAME, parents: ["appDataFolder"] };
    const boundary = "vault_boundary_" + Date.now();
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      JSON.stringify(metadata) +
      `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
      content +
      `\r\n--${boundary}--`;

    const res = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );
    if (!res.ok) throw new Error(`Drive create failed: ${res.status}`);
  }
}

export async function download(): Promise<VaultSnapshot | null> {
  if (!accessToken) throw new Error("Not connected to Google Drive");

  const fileId = await findVaultFile();
  if (!fileId) return null;

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Drive download failed: ${res.status}`);

  const data = await res.json();
  if (!data.version || !data.hash || !data.credentials) return null;
  return data as VaultSnapshot;
}
