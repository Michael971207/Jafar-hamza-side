import { addDays, toDateOnly, toUtcDate } from "@/lib/dates";

// Lesbar 2-måneders kalender som viser hvilke datoer som er opptatt.
// busy = liste over halvåpne intervaller [start, end) i YYYY-MM-DD.

const WEEKDAYS = ["ma", "ti", "on", "to", "fr", "lø", "sø"];
const MONTHS = [
  "januar", "februar", "mars", "april", "mai", "juni",
  "juli", "august", "september", "oktober", "november", "desember",
];

function isBusy(day: Date, busy: { start: string; end: string }[]): boolean {
  const d = toDateOnly(day);
  return busy.some((b) => d >= b.start && d < b.end);
}

function MonthGrid({
  year,
  month,
  busy,
  today,
}: {
  year: number;
  month: number;
  busy: { start: string; end: string }[];
  today: Date;
}) {
  const first = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  // Mandag = 0
  const startWeekday = (first.getUTCDay() + 6) % 7;

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(Date.UTC(year, month, d)));

  return (
    <div>
      <div className="mb-2 text-center text-sm font-semibold capitalize">
        {MONTHS[month]} {year}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-ink-muted">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1 uppercase">{w}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const past = day < today;
          const busyDay = isBusy(day, busy);
          return (
            <div
              key={i}
              className={[
                "grid h-8 place-items-center rounded-md text-xs",
                past
                  ? "text-ink-muted/40"
                  : busyDay
                  ? "bg-ink/10 text-ink-muted line-through"
                  : "bg-brand/10 font-medium text-brand",
              ].join(" ")}
            >
              {day.getUTCDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AvailabilityCalendar({
  busy,
}: {
  busy: { start: string; end: string }[];
}) {
  const today = toUtcDate(new Date());
  const m1 = today.getUTCMonth();
  const y1 = today.getUTCFullYear();
  const next = addDays(new Date(Date.UTC(y1, m1 + 1, 1)), 0);

  return (
    <div>
      <div className="grid gap-6 sm:grid-cols-2">
        <MonthGrid year={y1} month={m1} busy={busy} today={today} />
        <MonthGrid
          year={next.getUTCFullYear()}
          month={next.getUTCMonth()}
          busy={busy}
          today={today}
        />
      </div>
      <div className="mt-4 flex gap-4 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-brand/20" /> Ledig
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-ink/10" /> Opptatt
        </span>
      </div>
    </div>
  );
}
