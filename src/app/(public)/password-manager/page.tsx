import { Metadata } from "next";
import { VaultLandingClient } from "./client";

export const metadata: Metadata = {
  title: "Free Password Manager | Password Vault — Secure, Encrypted, Zero-Knowledge",
  description:
    "Download Password Vault — a free, encrypted password manager that runs entirely in your browser. AES-256-GCM encryption, zero-knowledge architecture, no server, no account needed.",
  manifest: "/vault-manifest.json",
};

export default function PasswordManagerPage() {
  return <VaultLandingClient />;
}
