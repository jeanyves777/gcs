import { Metadata } from "next";
import { VaultLandingClient } from "./client";

export const metadata: Metadata = {
  title: "Free Password Manager | GCS Vault — Secure, Encrypted, Zero-Knowledge",
  description:
    "Download GCS Vault — a free, encrypted password manager that runs entirely in your browser. AES-256-GCM encryption, zero-knowledge architecture, no server, no account needed.",
};

export default function PasswordManagerPage() {
  return <VaultLandingClient />;
}
