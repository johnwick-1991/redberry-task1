import clsx from 'clsx';
import { nextSevenDays, parseISODate, todayISO } from '@/lib/format';

/** Horizontal picker for the next 7 days. Exactly one date is selected; today by default. */
export function DateStrip({
  value,
  onChange,
  className,
  compact = false,
  available,
}: {
  value: string;
  onChange: (date: string) => void;
  className?: string;
  /** Narrow containers (the filter sidebar): wrap onto two rows. */
  compact?: boolean;
  /** Dates that have sessions. When given, the other days are shown but disabled. */
  available?: string[];
}) {
  const days = nextSevenDays();
  const today = todayISO();

  return (
    <div role="radiogroup" aria-label="Date" className={clsx('grid gap-1.5', compact ? 'grid-cols-4' : 'grid-cols-7', className)}>
      {days.map((iso, i) => {
        const d = parseISODate(iso);
        const selected = iso === value;
        const disabled = !selected && available !== undefined && !available.includes(iso);
        return (
          <button
            key={iso}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            title={disabled ? 'No sessions on this day' : undefined}
            onClick={() => onChange(iso)}
            className={clsx(
              'flex flex-col items-center rounded-lg border px-1 py-2 transition-colors',
              selected
                ? 'cursor-pointer border-accent bg-accent text-white shadow-lg shadow-accent/25'
                : disabled
                  ? 'cursor-not-allowed border-line/50 bg-surface-2/40 text-ink opacity-40'
                  : 'cursor-pointer border-line bg-surface-2 text-ink hover:border-ink/30',
            )}
          >
            <span className={clsx('text-[11px] font-semibold uppercase', !selected && 'text-muted')}>
              {iso === today ? 'Today' : i === 1 ? 'Tmrw' : d.toLocaleDateString('en-GB', { weekday: 'short' })}
            </span>
            <span className="text-lg font-bold leading-tight">{d.getDate()}</span>
            <span className={clsx('text-[11px]', !selected && 'text-muted')}>
              {d.toLocaleDateString('en-GB', { month: 'short' })}
            </span>
          </button>
        );
      })}
    </div>
  );
}
