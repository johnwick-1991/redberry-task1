import clsx from 'clsx';
import type { ReactNode } from 'react';
import type { FilterOptions } from '@/api/types';
import { DateStrip } from '@/components/ui/DateStrip';
import { Skeleton } from '@/components/ui/Spinner';
import { FigmaIcon } from '@/components/ui/icons';
import { availableFormats, type SessionsUrlState } from './useSessionsUrlState';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={title} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase leading-none tracking-[0.72px] text-muted">{title}</p>
        {children}
      </div>
      <div className="h-px bg-surface-3" />
    </div>
  );
}

function Check({
  checked,
  onChange,
  label,
  sub,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  sub?: string;
}) {
  return (
    <label className="group flex cursor-pointer items-center gap-2.5">
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        className={clsx(
          'grid size-[18px] shrink-0 place-items-center rounded-[5px] border-[1.5px] transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-accent',
          checked ? 'border-accent bg-accent text-white' : 'border-disabled group-hover:border-muted',
        )}
      >
        {checked && <FigmaIcon name="confirm" className="size-3" />}
      </span>
      <span className="text-sm font-semibold leading-none">{label}</span>
      {sub && <span className="text-xs text-muted">· {sub}</span>}
    </label>
  );
}

const toggle = <T,>(list: T[], value: T) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

interface Props {
  options: FilterOptions | undefined;
  state: SessionsUrlState;
  selectedFormats: string[];
  activeCount: number;
  onChange: (patch: Partial<SessionsUrlState>) => void;
  onClear: () => void;
}

export function FiltersSidebar({ options, state, selectedFormats, activeCount, onChange, onClear }: Props) {
  const shell = 'sticky top-6 flex w-80 shrink-0 flex-col self-start rounded-2xl bg-surface p-6';

  if (!options) {
    return (
      <aside className={clsx(shell, 'gap-6')}>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i}>
            <Skeleton className="mb-3 h-3 w-20" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="mt-3 h-5 w-full" />
          </div>
        ))}
      </aside>
    );
  }

  const formats = availableFormats(options, state.venues);

  return (
    <aside className={clsx(shell, 'max-h-[calc(100vh-3rem)] gap-6 overflow-y-auto')} aria-label="Filters">
      <h2 className="text-lg font-extrabold leading-none">Filters</h2>
      <Section title="Venue">
        {options.venues.map((v) => (
          <Check
            key={v.slug}
            label={v.name}
            sub={v.city}
            checked={state.venues.includes(v.slug)}
            onChange={() => onChange({ venues: toggle(state.venues, v.slug) })}
          />
        ))}
      </Section>

      <Section title="Date">
        <DateStrip compact value={state.date} onChange={(date) => onChange({ date })} />
      </Section>

      <Section title="Format">
        {formats.map((f) => (
          <Check
            key={f.slug}
            label={f.name}
            checked={selectedFormats.includes(f.slug)}
            onChange={() => onChange({ formats: toggle(selectedFormats, f.slug) })}
          />
        ))}
      </Section>

      <Section title="Language">
        {options.languages.map((l) => (
          <Check
            key={l.slug}
            label={l.name}
            checked={state.languages.includes(l.slug)}
            onChange={() => onChange({ languages: toggle(state.languages, l.slug) })}
          />
        ))}
      </Section>

      <Section title="Time of Day">
        {options.timeBands.map((b) => {
          const [name, range] = splitBand(b.label);
          return (
            <Check
              key={b.id}
              label={name}
              sub={range}
              checked={state.bands.includes(b.id)}
              onChange={() => onChange({ bands: toggle(state.bands, b.id) })}
            />
          );
        })}
      </Section>

      <div className="mt-auto flex flex-col items-center gap-2.5 pt-6">
        {(activeCount > 0 || state.search) && (
          <button
            type="button"
            onClick={onClear}
            className="w-full cursor-pointer rounded-full border border-ink px-4 py-2 text-xs font-semibold transition-colors hover:bg-tint-white"
          >
            Clear filters
          </button>
        )}
        <span className="text-xs text-muted">
          {activeCount} {activeCount === 1 ? 'filter' : 'filters'} active
        </span>
      </div>
    </aside>
  );
}

/** "Evening (after 18:00)" -> ["Evening", "after 18:00"], to match the label · range layout. */
function splitBand(label: string): [string, string | undefined] {
  const m = label.match(/^(.*?)\s*\((.*)\)$/);
  return m ? [m[1], m[2]] : [label, undefined];
}
