import clsx from 'clsx';
import type { Seat, SeatMap as SeatMapData, SeatState } from '@/api/types';

interface SeatMapProps {
  map: SeatMapData;
  selectedIds: Set<number>;
  /** Seats we lost to someone else (409) and must show as sold until the refetch lands. */
  lostIds: Set<number>;
  onToggle: (seat: Seat, sectionName: string) => void;
}

const SEAT = 'size-9 shrink-0';

function effectiveState(seat: Seat, lostIds: Set<number>): SeatState {
  if (lostIds.has(seat.id)) return 'sold';
  // Seats under MY live hold come back as held; they are still mine to keep or drop.
  if (seat.isMine && seat.state === 'held') return 'available';
  return seat.state;
}

/**
 * Drawn entirely from the API response: sections -> rows -> seats.
 * Row labels come from the data (some halls skip letters), gaps for
 * "unavailable" spots keep the grid aligned, and aisleAfter adds a gangway.
 */
export function SeatMap({ map, selectedIds, lostIds, onToggle }: SeatMapProps) {
  return (
    <div className="flex flex-col items-center gap-8">
      <div className="w-full max-w-xl">
        <div className="h-2 rounded-full bg-gradient-to-r from-transparent via-ink/60 to-transparent shadow-[0_8px_30px_rgba(238,241,248,0.25)]" />
        <p className="mt-2 text-center text-xs font-bold uppercase tracking-[0.4em] text-muted">Screen</p>
      </div>

      {map.sections.map((section) => (
        <div key={section.name} className="flex flex-col items-center gap-2">
          <h4 className="mb-1 text-xs font-bold uppercase tracking-widest text-muted">{section.name}</h4>
          {section.rows.map((row) => (
            <div key={row.label} className="flex items-center gap-1.5">
              <span className="w-6 text-center text-xs font-semibold text-muted">{row.label}</span>
              {row.seats.map((seat) => {
                const state = effectiveState(seat, lostIds);
                const selected = selectedIds.has(seat.id);
                return (
                  <SeatCell
                    key={seat.id}
                    seat={seat}
                    state={state}
                    selected={selected}
                    onClick={() => onToggle(seat, section.name)}
                  />
                );
              })}
              <span className="w-6 text-center text-xs font-semibold text-muted">{row.label}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function SeatCell({
  seat,
  state,
  selected,
  onClick,
}: {
  seat: Seat;
  state: SeatState;
  selected: boolean;
  onClick: () => void;
}) {
  const aisle = seat.aisleAfter ? <span className="w-5 shrink-0" aria-hidden="true" /> : null;

  // No seat here at all (gangway, wheelchair space): keep the space, draw nothing.
  if (state === 'unavailable') {
    return (
      <>
        <span className={SEAT} aria-hidden="true" />
        {aisle}
      </>
    );
  }

  const selectable = state === 'available';
  const label =
    `Seat ${seat.code}, ` +
    (selected ? 'selected' : state === 'available' ? 'available' : state === 'held' ? 'temporarily held' : 'sold');

  return (
    <>
      <button
        type="button"
        disabled={!selectable && !selected}
        onClick={onClick}
        aria-pressed={selected}
        aria-label={label}
        title={label}
        className={clsx(
          SEAT,
          'rounded-t-lg rounded-b-sm border text-[11px] font-semibold transition-all',
          selected && 'cursor-pointer border-accent bg-accent text-white shadow-lg shadow-accent/30 scale-105',
          !selected && state === 'available' && 'cursor-pointer border-line bg-surface-3 text-ink/80 hover:border-accent hover:text-ink',
          !selected && state === 'held' && 'cursor-not-allowed border-warn/50 bg-warn/15 text-warn/70',
          !selected && state === 'sold' && 'cursor-not-allowed border-transparent bg-ink/10 text-muted/60',
        )}
      >
        {state === 'sold' && !selected ? '×' : seat.label}
      </button>
      {aisle}
    </>
  );
}

export function SeatLegend() {
  const items = [
    { label: 'Available', cls: 'border-line bg-surface-3' },
    { label: 'Selected', cls: 'border-accent bg-accent' },
    { label: 'Held by someone else', cls: 'border-warn/50 bg-warn/15' },
    { label: 'Sold', cls: 'border-transparent bg-ink/10' },
  ];
  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted" aria-label="Seat legend">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2">
          <span className={clsx('size-4 rounded-t-md rounded-b-sm border', i.cls)} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
