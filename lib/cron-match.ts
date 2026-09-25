/**
 * Minimal 5-field cron matcher (minute hour day-of-month month day-of-week).
 * Enterprise E3 — no third-party cron dependency.
 * Spec: suite-enterprise-program.md § E3
 */

export type CronParts = {
  minute: number[];
  hour: number[];
  dayOfMonth: number[];
  month: number[];
  dayOfWeek: number[];
};

function expandField(field: string, min: number, max: number): number[] | null {
  const out = new Set<number>();
  for (const part of field.split(',')) {
    const stepMatch = /^(.+)\/(\d+)$/.exec(part.trim());
    const body = stepMatch ? stepMatch[1]! : part.trim();
    const step = stepMatch ? Number(stepMatch[2]) : 1;
    if (!Number.isFinite(step) || step < 1) return null;

    if (body === '*') {
      for (let n = min; n <= max; n += step) out.add(n);
      continue;
    }
    const range = /^(\d+)-(\d+)$/.exec(body);
    if (range) {
      const a = Number(range[1]);
      const b = Number(range[2]);
      if (!Number.isFinite(a) || !Number.isFinite(b) || a < min || b > max || a > b) return null;
      for (let n = a; n <= b; n += step) out.add(n);
      continue;
    }
    const n = Number(body);
    if (!Number.isFinite(n) || n < min || n > max) return null;
    if ((n - min) % step === 0) out.add(n);
  }
  return [...out].sort((a, b) => a - b);
}

/** Parse classic 5-field cron. Returns null if invalid. */
export function parseCronExpression(expr: string): CronParts | null {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const minute = expandField(parts[0]!, 0, 59);
  const hour = expandField(parts[1]!, 0, 23);
  const dayOfMonth = expandField(parts[2]!, 1, 31);
  const month = expandField(parts[3]!, 1, 12);
  const dayOfWeek = expandField(parts[4]!, 0, 6);
  if (!minute || !hour || !dayOfMonth || !month || !dayOfWeek) return null;
  return { minute, hour, dayOfMonth, month, dayOfWeek };
}

/**
 * Wall-clock parts in a timezone via Intl (no luxon dependency).
 * Falls back to UTC when timezone is missing/invalid.
 */
export function zonedDateParts(
  date: Date,
  timezone?: string | null
): { minute: number; hour: number; dayOfMonth: number; month: number; dayOfWeek: number } {
  const tz = timezone?.trim() || 'UTC';
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      minute: 'numeric',
      hour: 'numeric',
      hourCycle: 'h23',
      day: 'numeric',
      month: 'numeric',
      weekday: 'short',
    });
    const bag: Record<string, string> = {};
    for (const p of fmt.formatToParts(date)) {
      if (p.type !== 'literal') bag[p.type] = p.value;
    }
    const weekdayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    return {
      minute: Number(bag.minute),
      hour: Number(bag.hour),
      dayOfMonth: Number(bag.day),
      month: Number(bag.month),
      dayOfWeek: weekdayMap[bag.weekday ?? ''] ?? date.getUTCDay(),
    };
  } catch {
    return {
      minute: date.getUTCMinutes(),
      hour: date.getUTCHours(),
      dayOfMonth: date.getUTCDate(),
      month: date.getUTCMonth() + 1,
      dayOfWeek: date.getUTCDay(),
    };
  }
}

export function cronMatchesAt(
  expression: string,
  date: Date,
  timezone?: string | null
): boolean {
  const parsed = parseCronExpression(expression);
  if (!parsed) return false;
  const parts = zonedDateParts(date, timezone);
  return (
    parsed.minute.includes(parts.minute) &&
    parsed.hour.includes(parts.hour) &&
    parsed.dayOfMonth.includes(parts.dayOfMonth) &&
    parsed.month.includes(parts.month) &&
    parsed.dayOfWeek.includes(parts.dayOfWeek)
  );
}

/** Minute bucket key for de-dupe (YYYY-MM-DDTHH:MM in zone). */
export function scheduleMinuteKey(date: Date, timezone?: string | null): string {
  const p = zonedDateParts(date, timezone);
  const y = date.toLocaleString('en-CA', {
    timeZone: timezone?.trim() || 'UTC',
    year: 'numeric',
  });
  const mo = String(p.month).padStart(2, '0');
  const d = String(p.dayOfMonth).padStart(2, '0');
  const h = String(p.hour).padStart(2, '0');
  const mi = String(p.minute).padStart(2, '0');
  return `${y}-${mo}-${d}T${h}:${mi}`;
}
