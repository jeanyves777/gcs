import type { PasswordOptions } from "./types";

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const NUMBERS = "0123456789";
const SYMBOLS = "!@#$%^&*()_+-=[]{}|;:,.<>?";

export function generatePassword(options: PasswordOptions): string {
  let charset = "";
  const required: string[] = [];

  if (options.uppercase) {
    charset += UPPER;
    required.push(UPPER);
  }
  if (options.lowercase) {
    charset += LOWER;
    required.push(LOWER);
  }
  if (options.numbers) {
    charset += NUMBERS;
    required.push(NUMBERS);
  }
  if (options.symbols) {
    charset += SYMBOLS;
    required.push(SYMBOLS);
  }

  if (charset.length === 0) {
    charset = UPPER + LOWER + NUMBERS;
    required.push(UPPER, LOWER, NUMBERS);
  }

  const bytes = crypto.getRandomValues(new Uint8Array(options.length + 32));
  const chars: string[] = [];

  // Ensure at least one from each required set
  for (let i = 0; i < required.length && i < options.length; i++) {
    const set = required[i];
    chars.push(set[bytes[i] % set.length]);
  }

  // Fill remaining with random from full charset
  for (let i = chars.length; i < options.length; i++) {
    chars.push(charset[bytes[i + required.length] % charset.length]);
  }

  // Shuffle using Fisher-Yates
  const shuffleBytes = crypto.getRandomValues(new Uint8Array(chars.length));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = shuffleBytes[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}

export function getPasswordStrength(
  password: string
): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: "Weak", color: "#ef4444" };
  if (score <= 3) return { score, label: "Fair", color: "#f59e0b" };
  if (score <= 4) return { score, label: "Good", color: "#3b82f6" };
  return { score, label: "Strong", color: "#22c55e" };
}
