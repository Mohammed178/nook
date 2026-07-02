import "server-only";
import { createHash, randomInt } from "node:crypto";

// Lowercase hex SHA-256. Byte-for-byte match for the Postgres
// `encode(digest(p_code, 'sha256'), 'hex')` produced by verify_phone_otp
// in migration 0033. If either side ever changes (e.g. switching to bcrypt),
// change both together — the comparison is a literal string ==.
export function sha256Hex(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

// 6-digit OTP, zero-padded. randomInt is cryptographically secure (libuv-backed
// in Node); Math.random would not be. The space is 1e6, brute-force capped to
// 5 attempts by verify_phone_otp.
export function generateOtpCode(): string {
  const n = randomInt(0, 1_000_000);
  return n.toString().padStart(6, "0");
}
