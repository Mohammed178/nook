import "server-only";

// Email notification on an agent application decision (LOCK-4.7 / L-4a2.8).
// Stub: real signature, log-only body. When a provider is wired (separate Late
// Catch), only the body below changes, callers and signature stay fixed.
export async function notifyAgentDecision({
  email,
  status,
  agencyName,
  statusReason,
}: {
  email: string;
  status: "approved" | "rejected";
  agencyName: string;
  // F2, the rejection reason (LOCK-4.7: rejection email carries it). Present on
  // reject, absent on approve. Signature stays stable for the real provider.
  statusReason?: string;
}): Promise<void> {
  // TODO: wire real provider (LOCK-4.7). Stub: log only, no send.
  console.log(
    `[notify] agent decision email=${email} status=${status} agency=${agencyName}` +
      (statusReason ? ` reason=${statusReason}` : ""),
  );
}
