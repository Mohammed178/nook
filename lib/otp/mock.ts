import "server-only";
import type { OtpProvider } from "./provider";

// Dev-safe mock: logs the code to the server console so the demo operator can
// read it from the `npm run dev` terminal. The plaintext code is NEVER returned
// to the client and NEVER persisted (the RPC stores only the SHA-256 hash).
//
// Production swap: replace with a TwilioSmsOtpProvider that calls Twilio's
// Programmable Messaging API. Caller signature unchanged. We keep ownership of
// the code lifecycle (gen + hash + verify), Twilio is pure transport.
export class MockOtpProvider implements OtpProvider {
  async sendOtp({ phone, code }: { phone: string; code: string }) {
    console.log(`[otp:mock] phone=${phone} code=${code}`);
    return { ok: true as const };
  }
}
