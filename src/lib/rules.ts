// The rules trap: "you can be right and still lose."
// A deadline market whose rules pay on what is *reported or confirmed* by the deadline,
// rather than on when the event happens, can resolve against someone who was right.
// The Strategy (MicroStrategy) "sells any bitcoin by May 31, 2026" market is the reference case:
// the sale happened May 26-31, the deadline was a Sunday, the 8-K filing came Monday June 1,
// and the market resolved No. Galaxy Research recommended labelling every market as
// event-based or confirmation-based; `basis` below is that label.
// Pure functions: no network, fully unit-tested.

import type { Flag } from "./verdict.ts";

export type RulesInput = {
  question: string;
  description: string;
  endDate: string | null; // ISO timestamp from Gamma
  resolutionSource?: string | null;
};

export type DeadlineInfo = {
  endDate: string;
  etDate: string; // YYYY-MM-DD in US Eastern time
  weekday: string; // e.g. "Sunday"
  label: string; // e.g. "Sunday, May 31"
  daysLeft: number; // may be negative for past deadlines
  risky: boolean; // Friday-Sunday, or within one day of a US market holiday
  why: string | null;
};

export type RulesResult = {
  basis: "event" | "confirmation";
  deadlineQuestion: boolean;
  reportingTerms: string[];
  deadline: DeadlineInfo | null;
  clarificationAdded: boolean;
  flags: Flag[];
};

// NYSE full-day closures. Filings and announcements slow down around these.
export const US_MARKET_HOLIDAYS: Record<string, string> = {
  "2026-01-01": "New Year's Day",
  "2026-01-19": "Martin Luther King Jr. Day",
  "2026-02-16": "Presidents' Day",
  "2026-04-03": "Good Friday",
  "2026-05-25": "Memorial Day",
  "2026-06-19": "Juneteenth",
  "2026-07-03": "Independence Day (observed)",
  "2026-09-07": "Labor Day",
  "2026-11-26": "Thanksgiving",
  "2026-12-25": "Christmas Day",
  "2027-01-01": "New Year's Day",
  "2027-01-18": "Martin Luther King Jr. Day",
  "2027-02-15": "Presidents' Day",
  "2027-03-26": "Good Friday",
  "2027-05-31": "Memorial Day",
  "2027-06-18": "Juneteenth (observed)",
  "2027-07-05": "Independence Day (observed)",
  "2027-09-06": "Labor Day",
};

const REPORTING_PATTERNS: Array<[string, RegExp]> = [
  ["announcement", /\bannounc\w*/i],
  ["report", /\breport(?:ed|s|ing)?\b/i],
  ["filing", /\b(?:filing|filed|files? with)\b/i],
  ["publicly", /\bpublicly\b/i],
  ["official information", /\bofficial(?:ly)?\s+(?:information|announc\w*|statement|sources?|confirm\w*|data|disclos\w*|report\w*)\b/i],
  ["press release", /\bpress releases?\b/i],
  ["SEC", /\bSEC\b|\b8-K\b|\b10-[QK]\b/],
  ["confirmed", /\bconfirm(?:ed|s|ation)\b/i],
  ["credible reporting", /\bcredible report\w*/i],
  ["disclosure", /\bdisclos\w*/i],
];

const DEADLINE_IN_QUESTION =
  /\b(?:by|before|no later than|on or before)\s+(?:the\s+)?(?:end\s+of\s+)?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|q[1-4]\b|20\d\d|\d{1,2}[/.-]|tomorrow|today|this|next|mon|tue|wed|thu|fri|sat|sun)/i;
const DEADLINE_IN_RULES = /\bby\s+(?:11:59|12:00|\d{1,2}:\d{2}\s*[ap]\.?m)|\bby the (?:date|end)\b|\bon or before\b|\bno later than\b/i;
const CLARIFICATION = /\badditional context\b|\bclarification\b|\bupdate[ds]?\s*(?:\(|:|-|—)|\bedit(?:ed)?\s*:/i;
const VAGUE = /\b(?:discretion|ambiguous|ambiguity|unclear|subjective|interpretation|sole determination|reasonable judgment)\b/i;

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function easternDate(iso: string): { ymd: string; weekday: string } | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { ymd: `${get("year")}-${get("month")}-${get("day")}`, weekday: get("weekday") };
}

function shiftYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function labelFor(ymd: string, weekday: string): string {
  const month = MONTHS[Number(ymd.slice(5, 7)) - 1] ?? "";
  return `${weekday}, ${month} ${Number(ymd.slice(8, 10))}`;
}

export function describeDeadline(endDate: string, now: Date = new Date()): DeadlineInfo | null {
  const et = easternDate(endDate);
  if (!et) return null;
  let why: string | null = null;
  if (et.weekday === "Saturday" || et.weekday === "Sunday") {
    why = `the deadline falls on a ${et.weekday}, when companies and agencies rarely publish`;
  } else if (et.weekday === "Friday") {
    why = "the deadline is a Friday, so anything that happens late in the day is usually published the next Monday";
  } else {
    for (const offset of [0, -1, 1]) {
      const holiday = US_MARKET_HOLIDAYS[shiftYmd(et.ymd, offset)];
      if (holiday) {
        why = offset === 0
          ? `the deadline falls on ${holiday}, a US market holiday`
          : `the deadline is next to ${holiday}, a US market holiday`;
        break;
      }
    }
  }
  const daysLeft = Math.floor((new Date(endDate).getTime() - now.getTime()) / 86_400_000);
  return {
    endDate,
    etDate: et.ymd,
    weekday: et.weekday || (WEEKDAYS[new Date(endDate).getUTCDay()] ?? ""),
    label: labelFor(et.ymd, et.weekday),
    daysLeft,
    risky: why !== null,
    why,
  };
}

export function analyzeRules(input: RulesInput, now: Date = new Date()): RulesResult {
  const text = `${input.description ?? ""}\n${input.resolutionSource ?? ""}`;
  const reportingTerms = REPORTING_PATTERNS.filter(([, re]) => re.test(text)).map(([name]) => name);
  const deadlineQuestion = DEADLINE_IN_QUESTION.test(input.question ?? "") || DEADLINE_IN_RULES.test(input.description ?? "");
  const deadline = input.endDate ? describeDeadline(input.endDate, now) : null;
  const confirmationBased = deadlineQuestion && reportingTerms.length > 0;
  const clarificationAdded = CLARIFICATION.test(input.description ?? "");
  const flags: Flag[] = [];

  if (confirmationBased && deadline?.risky) {
    flags.push({
      level: "HIGH_RISK",
      check: "reporting_deadline_near_weekend",
      message: `This market is decided by what gets officially reported by ${deadline.label}, not by what actually happens, and ${deadline.why}. If it happens but the news comes out late, you can be right and still lose.`,
    });
  } else if (confirmationBased) {
    flags.push({
      level: "CAUTION",
      check: "reporting_dependent",
      message: `This market is decided by what gets officially reported${deadline ? ` by ${deadline.label}` : ""}, not by what actually happens. If the news comes out late, it can decide the result.`,
    });
  }

  if (clarificationAdded) {
    flags.push({
      level: "CAUTION",
      check: "clarification_added",
      message: "Polymarket added an extra note to the rules after the market opened. Read it: the result may depend on that note, not the original rules.",
    });
  }

  if (VAGUE.test(input.description ?? "")) {
    flags.push({
      level: "CAUTION",
      check: "vague_wording",
      message: "The rules use vague words, so who wins can come down to how someone reads them.",
    });
  }

  return {
    basis: confirmationBased ? "confirmation" : "event",
    deadlineQuestion,
    reportingTerms,
    deadline,
    clarificationAdded,
    flags,
  };
}
