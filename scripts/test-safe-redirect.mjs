// H1 item 4, unit test for safeRedirectPath (open-redirect guard).
// Run: node --experimental-strip-types scripts/test-safe-redirect.mjs
import assert from "node:assert/strict";
import { safeRedirectPath } from "../lib/safe-redirect.ts";

const cases = [
  ["//evil.com", "/account"],
  ["https://evil.com", "/account"],
  ["/\\evil.com", "/account"],
  ["\\\\evil.com", "/account"],
  ["", "/account"],
  [null, "/account"],
  ["/", "/"],
  ["/agents/dashboard", "/agents/dashboard"],
  ["/agents/dashboard?tab=x#y", "/agents/dashboard?tab=x#y"],
];

let pass = 0;
for (const [input, expected] of cases) {
  const actual = safeRedirectPath(input);
  assert.equal(
    actual,
    expected,
    `safeRedirectPath(${JSON.stringify(input)}) => ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`,
  );
  console.log(`ok  ${JSON.stringify(input)} -> ${JSON.stringify(actual)}`);
  pass++;
}
console.log(`\n${pass}/${cases.length} passed`);
