import clsx from 'clsx';
import { nextSevenDays, parseISODate } from '@/lib/format';

/** The next 7 days; exactly one is selected, today by default. `compact` is the sidebar size. */
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
  compact?: boolean;
  /** Dates that have sessions. When given, the other days are shown but disabled. */
  available?: string[];
}) {
  const days = nextSevenDays();

  return (
    <div role="radiogroup" aria-label="Date" className={clsx('flex', compact ? 'gap-1.5' : 'gap-[7px]', className)}>
      {days.map((iso) => {
        const d = parseISODate(iso);
        const selected = iso === value;
        const disabled = !selected && available !== undefined && !available.includes(iso);
        return (
          <button
            key={iso}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            disabled={disabled}
            title={disabled ? 'No sessions on this day' : undefined}
            onClick={() => onChange(iso)}
            className={clsx(
              'flex shrink-0 flex-col items-center justify-center gap-1.5 leading-none transition-colors',
              compact
                ? 'h-[54px] min-w-0 flex-1 rounded-lg text-xs font-semibold shadow-[0_1px_2px_rgb(0_0_0/0.2)]'
                : 'size-20 rounded-2xl',
              selected
                ? 'cursor-pointer bg-accent text-white'
                : disabled
                  ? 'cursor-not-allowed opacity-40'
                  : 'cursor-pointer hover:bg-disabled',
              !selected && (compact ? 'bg-surface-3' : 'bg-surface'),
            )}
          >
            <span className={compact ? '' : 'text-xs font-semibold'}>
              {d.toLocaleDateString('en-GB', { weekday: 'short' })}
            </span>
            <span className={compact ? '' : 'text-lg font-extrabold'}>{d.getDate()}</span>
          </button>
        );
      })}
    </div>
  );
}
