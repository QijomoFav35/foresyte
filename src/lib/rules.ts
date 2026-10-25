const REPORTING_TERMS =
  /\b(announce(?:ment|d)?|report(?:ed|ing)?|filing|filed|publicly|official|press release|SEC|confirmed by|credible reporting)\b/i;

const VAGUE_TERMS = /\b(discretion|consensus|clarification|ambiguous|unclear|subjective)\b/i;

const US_HOLIDAYS = new Set([
  "2026-11-26",
  "2026-12-25",
  "2027-01-01",
  "2027-01-18",
  "2027-02-15",
  "2027-03-26",
  "2027-05-31",
  "2027-06-18",
  "2027-07-05",
  "2027-09-06",
]);

export type FlagLevel = "CLEAR" | "CAUTION" | "HIGH_RISK";

export type RuleFlag = {
  level: FlagLevel;
  message: string;
  reportingDependent: boolean;
  weekendOrHoliday: boolean;
};

function easternParts(iso: string): { ymd: string; weekday: number; label: string } | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  });
  const parts = Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]));
  const ymd = `${parts.year}-${parts.month}-${parts.day}`;
  const weekdayName = parts.weekday ?? "";
  const weekdayMap: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };
  const weekday = weekdayMap[weekdayName] ?? -1;
  const label = `${weekdayName}, ${parts.month}/${parts.day}/${parts.year}`;
  return { ymd, weekday, label };
}

function nearHoliday(ymd: string): boolean {
  if (US_HOLIDAYS.has(ymd)) return true;
  const d = new Date(`${ymd}T12:00:00Z`);
  for (const h of US_HOLIDAYS) {
    const hd = new Date(`${h}T12:00:00Z`);
    const diffDays = Math.abs((d.getTime() - hd.getTime()) / 86_400_000);
    if (diffDays <= 1) return true;
  }
  return false;
}

function hasSourceLink(rules: string): boolean {
  return /https?:\/\/|www\./i.test(rules);
}

export function analyzeRules(rulesText: string, endDate?: string | null): RuleFlag[] {
  const flags: RuleFlag[] = [];
  const rules = rulesText || "";
  const reportingDependent = REPORTING_TERMS.test(rules);
  const vague = VAGUE_TERMS.test(rules);
  const noSource = rules.length > 0 && !hasSourceLink(rules);

  let weekendOrHoliday = false;
  let deadlineLabel = "the deadline";
  if (endDate) {
    const parts = easternParts(endDate);
    if (parts) {
      deadlineLabel = parts.label;
      const friMon = parts.weekday === 5 || parts.weekday === 6 || parts.weekday === 0 || parts.weekday === 1;
      weekendOrHoliday = friMon || nearHoliday(parts.ymd);
    }
  }

  if (reportingDependent && weekendOrHoliday) {
    flags.push({
      level: "HIGH_RISK",
      message: `This market resolves on what's reported by ${deadlineLabel}, not what happens. If the event happens over the weekend, you can be right and still lose.`,
      reportingDependent,
      weekendOrHoliday,
    });
  } else if (reportingDependent) {
    flags.push({
      level: "CAUTION",
      message:
        "This market resolves on what's officially reported, not on what happens. A reporting delay can decide it.",
      reportingDependent,
      weekendOrHoliday,
    });
  }

  if (vague) {
    flags.push({
      level: "CAUTION",
      message: "The rules use open-ended wording, so the outcome can depend on interpretation.",
      reportingDependent,
      weekendOrHoliday,
    });
  }

  if (noSource) {
    flags.push({
      level: "CAUTION",
      message: "The rules don't name a specific source to check.",
      reportingDependent,
      weekendOrHoliday,
    });
  }

  return flags;
}

export function worstLevel(levels: FlagLevel[]): FlagLevel {
  if (levels.includes("HIGH_RISK")) return "HIGH_RISK";
  if (levels.includes("CAUTION")) return "CAUTION";
  return "CLEAR";
}

export function daysLeft(endDate?: string | null): number | null {
  if (!endDate) return null;
  const end = new Date(endDate).getTime();
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - Date.now()) / 86_400_000);
}
