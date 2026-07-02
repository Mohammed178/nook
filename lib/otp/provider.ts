import "server-only";
import { MockOtpProvider } from "./mock";

// OtpProvider abstracts DELIVERY only — the SMS send. The verification lifecycle
// (code generation, SHA-256 hash, expiry, attempt lockout) lives in our RPCs
// (migration 0033 §6.3/6.4) and in lib/otp/hash.ts. Production swap target is
// Twilio's Programmable Messaging SMS-send (we keep ownership of the code),
// NOT Twilio Verify (which would own the lifecycle and bypass our RPCs).
//
// Interface contract: a provider receives the already-generated plaintext code
// and is responsible only for getting it to the agent's phone. The plaintext
// code never leaves the request scope — it is hashed before storage and the
// provider is the only other thing that sees it (per send).
export interface OtpProvider {
  sendOtp(args: {
    phone: string;
    code: string;
  }): Promise<{ ok: true } | { ok: false; reason: string }>;
}

// Provider factory. Switch on env so swapping the implementation is one import
// change at the future Twilio site, not a callsite refactor. Until that env
// is wired, every environment returns the mock.
//
// The mock is imported statically so it bundles deterministically; the future
// Twilio branch should use a dynamic `await import("./twilio")` so the SDK
// stays out of the dev/demo bundle.
export function getOtpProvider(): OtpProvider {
  if (process.env.NOOK_OTP_PROVIDER === "twilio") {
    // Deferred: TwilioSmsOtpProvider sends via Programmable Messaging.
    // const { TwilioSmsOtpProvider } = await import("./twilio");
    // return new TwilioSmsOtpProvider();
    throw new Error("twilio OTP provider not wired yet");
  }
  return new MockOtpProvider();
}
