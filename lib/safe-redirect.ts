// Same-origin redirect validator for the `?redirect=` param (H1 item 4).
//
// Open-redirect guard: the login flow sends the user to whatever `redirect`
// carries after sign-in. Anything not a same-origin relative path (//evil.com,
// https://evil.com, /\evil.com, backslash/control-char tricks) collapses to the
// /account default.
//
// Uses the WHATWG URL constructor against a placeholder base so the parser
// normalizes exactly as the browser will (\ -> /, control chars stripped):
// what we validate is what navigates. A raw that resolves to any origin other
// than the placeholder escaped the relative-path space -> reject.
export function safeRedirectPath(raw: string | null): string {
  const FALLBACK = "/account";
  if (!raw) return FALLBACK;
  try {
    const u = new URL(raw, "https://placeholder.invalid");
    if (u.origin !== "https://placeholder.invalid") return FALLBACK;
    return u.pathname + u.search + u.hash;
  } catch {
    return FALLBACK;
  }
}
