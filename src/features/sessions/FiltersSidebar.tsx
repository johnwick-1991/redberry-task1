import clsx from 'clsx';
import type { ReactNode } from 'react';
import type { FilterOptions } from '@/api/types';
import { DateStrip } from '@/components/ui/DateStrip';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Spinner';
import { CheckIcon } from '@/components/ui/icons';
import { availableFormats, type SessionsUrlState } from './useSessionsUrlState';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-b border-line py-5 first:pt-0 last:border-b-0">
      <legend className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">{title}</legend>
      {children}
    </fieldset>
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
    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-3">
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        className={clsx(
          'grid size-5 shrink-0 place-items-center rounded-md border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-accent',
          checked ? 'border-accent bg-accent text-white' : 'border-line bg-surface-2',
        )}
      >
        {checked && <CheckIcon className="size-3.5" strokeWidth={3} />}
      </span>
      <span className="flex-1 text-sm">{label}</span>
      {sub && <span className="text-xs text-muted">{sub}</span>}
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
  if (!options) {
    return (
      <aside className="sticky top-24 flex w-80 shrink-0 flex-col gap-4 self-start rounded-2xl border border-line bg-surface p-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i}>
            <Skeleton className="mb-3 h-3 w-20" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="mt-2 h-8 w-full" />
          </div>
        ))}
      </aside>
    );
  }

  const formats = availableFormats(options, state.venues);

  return (
    <aside className="sticky top-24 flex max-h-[calc(100vh-7rem)] w-80 shrink-0 flex-col self-start rounded-2xl border border-line bg-surface">
      <div className="flex-1 overflow-y-auto p-5">
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
              sub={f.priceUplift > 0 ? `+₾${f.priceUplift}` : undefined}
              checked={selectedFormats.includes(f.slug)}
              onChange={() => onChange({ formats: toggle(selectedFormats, f.slug) })}
            />
          ))}
          {state.venues.length > 0 && (
            <p className="mt-2 px-2 text-xs text-muted">Showing formats available at the selected venues.</p>
          )}
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
          {options.timeBands.map((b) => (
            <Check
              key={b.id}
              label={b.label}
              checked={state.bands.includes(b.id)}
              onChange={() => onChange({ bands: toggle(state.bands, b.id) })}
            />
          ))}
        </Section>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line p-4">
        <span className="text-sm text-muted">
          {activeCount} {activeCount === 1 ? 'filter' : 'filters'} active
        </span>
        <Button variant="secondary" size="sm" onClick={onClear} disabled={activeCount === 0 && !state.search}>
          Clear All Filters
        </Button>
      </div>
    </aside>
  );
}
