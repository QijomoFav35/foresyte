// Request codes for the deep scan: the page turns a link into FSY-XXXXXX,
// the person pastes a prompt with that code into their PayBox agent, and the paid call carries it.
// Generation and validation only; the server keeps the code -> request map.

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // no 0/O, 1/I/L: easy to read aloud and retype
export const CODE_RE = /^FSY-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/;

export function newCode(random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  const bytes = random(6);
  let out = "FSY-";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

export function normalizeCode(input: string): string | null {
  const c = input.trim().toUpperCase().replace(/^FSY(?=[^-])/, "FSY-");
  return CODE_RE.test(c) ? c : null;
}

export type ScanRequest = { market: string; outcome: string | null; stakeUsdc: number };

// The prompt a person pastes into their PayBox chat (the Full Audit is the deep_scan tool). Agents can also call the paid URL directly.
export function agentPrompt(code: string): string {
  return `Use the Foresyte plugin to run a full audit with code ${code}`;
}
