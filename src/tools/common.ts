import * as z from "zod/v4";

export const walletSchema = z.string().regex(/^0x[0-9a-fA-F]{40}$/, "A 0x wallet address (40 hex characters).");

export const reasonSchema = z.object({
  level: z.enum(["CAUTION", "HIGH_RISK"]),
  check: z.string(),
  message: z.string(),
});

export const levelSchema = z.enum(["CLEAR", "CAUTION", "HIGH_RISK"]);

export function errorResult(text: string) {
  return { isError: true as const, content: [{ type: "text" as const, text }] };
}

export function okResult<T extends Record<string, unknown>>(text: string, structured: T) {
  return { content: [{ type: "text" as const, text }], structuredContent: structured };
}

// JSON cannot carry NaN or Infinity; structured output must validate, so round and coerce.
export function money(value: number): number {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}

export function maybe(value: number | null | undefined, digits = 4): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}
