import clsx from 'clsx';
import type { CSSProperties } from 'react';
import type { Seat, SeatMap as SeatMapData, SeatState } from '@/api/types';

interface SeatMapProps {
  map: SeatMapData;
  selectedIds: Set<number>;
  /** Seats we lost to someone else (409) and must show as sold until the refetch lands. */
  lostIds: Set<number>;
  onToggle: (seat: Seat, sectionName: string) => void;
}

/** Room for the map inside the 720px column, minus row labels. */
const MAP_WIDTH = 680;
const GAP = 8;
const AISLE = 16;
const MAX_SEAT = 52;
const MIN_SEAT = 30;

function effectiveState(seat: Seat, lostIds: Set<number>): SeatState {
  if (lostIds.has(seat.id)) return 'sold';
  // Seats under MY live hold come back as held; they are still mine to keep or drop.
  if (seat.isMine && seat.state === 'held') return 'available';
  return seat.state;
}

/** Seats are 52px as in the design, scaled down for halls whose rows don't fit. */
function seatSize(map: SeatMapData) {
  let size = MAX_SEAT;
  map.sections.forEach((section) =>
    section.rows.forEach((row) => {
      const n = row.seats.length;
      if (n === 0) return;
      const aisles = row.seats.filter((s) => s.aisleAfter).length;
      size = Math.min(size, Math.floor((MAP_WIDTH - aisles * (AISLE + GAP) - (n - 1) * GAP) / n));
    }),
  );
  return Math.max(MIN_SEAT, size);
}

/**
 * Drawn entirely from the API response: sections -> rows -> seats.
 * Row labels come from the data (some halls skip letters), gaps for
 * "unavailable" spots keep the grid aligned, and aisleAfter adds a gangway.
 */
export function SeatMap({ map, selectedIds, lostIds, onToggle }: SeatMapProps) {
  const size = seatSize(map);
  const style = { '--seat': `${size}px` } as CSSProperties;

  return (
    <div className="flex flex-col items-center gap-8" style={style}>
      <div className="w-full px-5">
        <div className="flex h-[30px] items-center justify-center rounded-b-[20px] bg-surface-3 text-xs font-semibold">
          SCREEN
        </div>
      </div>

      {map.sections.map((section) => (
        <div key={section.name} className="flex flex-col items-center gap-2.5">
          {map.sections.length > 1 && (
            <h4 className="text-xs font-semibold uppercase text-muted">
              {section.name}
              {section.rows.length > 0 &&
                ` · Rows ${section.rows[0].label}–${section.rows[section.rows.length - 1].label}`}
            </h4>
          )}
          {section.rows.map((row) => (
            <div key={row.label} className="flex items-center gap-2">
              <span className="w-5 text-center text-xs font-semibold">{row.label}</span>
              {row.seats.map((seat) => (
                <SeatCell
                  key={seat.id}
                  seat={seat}
                  state={effectiveState(seat, lostIds)}
                  selected={selectedIds.has(seat.id)}
                  onClick={() => onToggle(seat, section.name)}
                />
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const SEAT = 'relative grid size-(--seat) shrink-0 place-items-center overflow-hidden rounded-[10px] font-extrabold';

/** Diagonal stripes from the design, used for seats someone else holds. */
function Stripes({ small = false }: { small?: boolean }) {
  return (
    <img
      src={small ? '/figma/held-stripes-small.svg' : '/figma/held-stripes.svg'}
      alt=""
      className="pointer-events-none absolute left-1/2 top-1/2 size-[160%] max-w-none -translate-x-1/2 -translate-y-1/2 -rotate-[37.44deg]"
    />
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
  const aisle = seat.aisleAfter ? <span className="w-4 shrink-0" aria-hidden="true" /> : null;

  // No seat here at all (gangway, wheelchair space): keep the space, draw nothing.
  if (state === 'unavailable') {
    return (
      <>
        <span className="size-(--seat) shrink-0" aria-hidden="true" />
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
          'border transition-colors',
          selected && 'cursor-pointer border-bg bg-accent text-lg text-white',
          !selected && state === 'available' && 'cursor-pointer border-disabled bg-surface text-sm text-ink shadow-[0_1px_2px_rgb(0_0_0/0.2)] hover:border-accent',
          !selected && state === 'held' && 'cursor-not-allowed border-transparent bg-surface text-sm text-muted',
          !selected && state === 'sold' && 'cursor-not-allowed border-transparent bg-surface text-sm text-disabled',
        )}
      >
        {!selected && state === 'held' && <Stripes />}
        <span className="relative">{seat.label}</span>
      </button>
      {aisle}
    </>
  );
}

export function SeatLegend() {
  const box = 'relative size-4 shrink-0 overflow-hidden rounded-[5px]';
  const items = [
    { label: 'Available', el: <span className={clsx(box, 'border border-disabled bg-surface')} /> },
    { label: 'Selected', el: <span className={clsx(box, 'bg-accent')} /> },
    { label: 'Sold', el: <span className={clsx(box, 'bg-surface')} /> },
    {
      label: 'Held by another user',
      el: (
        <span className={clsx(box, 'bg-surface')}>
          <Stripes small />
        </span>
      ),
    },
  ];
  return (
    <ul className="flex flex-wrap items-center justify-center gap-6 text-xs text-muted" aria-label="Seat legend">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2">
          {i.el}
          {i.label}
        </li>
      ))}
    </ul>
  );
}
