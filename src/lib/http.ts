// Network access for every tool. PayBox gives each call 10 s in a fresh sandbox,
// so each tool creates one Deadline (8 s) and every request gets at most 2.5 s of it.

export const PER_REQUEST_MS = 2500;
export const TOOL_BUDGET_MS = 8000;
const MIN_USEFUL_MS = 300;

export class Deadline {
  private readonly end: number;
  constructor(budgetMs: number = TOOL_BUDGET_MS) {
    this.end = Date.now() + budgetMs;
  }
  left(): number {
    return this.end - Date.now();
  }
  hasTimeFor(ms: number = MIN_USEFUL_MS): boolean {
    return this.left() >= ms;
  }
}

export class OutOfTime extends Error {
  constructor() {
    super("Ran out of time before Polymarket answered.");
  }
}

export async function getJson(url: string, deadline: Deadline): Promise<unknown> {
  const timeout = Math.min(PER_REQUEST_MS, deadline.left());
  if (timeout < MIN_USEFUL_MS) throw new OutOfTime();
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(timeout),
    });
  } catch (error) {
    const name = (error as { name?: string })?.name;
    if (name === "TimeoutError" || name === "AbortError") {
      throw new Error(`${new URL(url).host} did not answer within ${(timeout / 1000).toFixed(1)} s.`);
    }
    throw new Error(`Could not reach ${new URL(url).host}.`);
  }
  if (!res.ok) throw new Error(`${new URL(url).host} answered HTTP ${res.status}.`);
  return res.json();
}
