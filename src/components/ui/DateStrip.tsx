import clsx from 'clsx';
import { nextSevenDays, parseISODate, todayISO } from '@/lib/format';

/** Horizontal picker for the next 7 days. Exactly one date is selected; today by default. */
export function DateStrip({
  value,
  onChange,
  className,
  compact = false,
}: {
  value: string;
  onChange: (date: string) => void;
  className?: string;
  /** Narrow containers (the filter sidebar): wrap onto two rows. */
  compact?: boolean;
}) {
  const days = nextSevenDays();
  const today = todayISO();

  return (
    <div role="radiogroup" aria-label="Date" className={clsx('grid gap-1.5', compact ? 'grid-cols-4' : 'grid-cols-7', className)}>
      {days.map((iso, i) => {
        const d = parseISODate(iso);
        const selected = iso === value;
        return (
          <button
            key={iso}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(iso)}
            className={clsx(
              'flex cursor-pointer flex-col items-center rounded-lg border px-1 py-2 transition-colors',
              selected
                ? 'border-accent bg-accent text-white shadow-lg shadow-accent/25'
                : 'border-line bg-surface-2 text-ink hover:border-ink/30',
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
