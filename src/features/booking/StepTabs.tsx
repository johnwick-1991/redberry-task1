import clsx from 'clsx';

export type BookingStep = 'seats' | 'checkout' | 'done';

/** "SEATS | CHECKOUT" progress tabs. Going back to Seats keeps the hold. */
export function StepTabs({ step, onSeats }: { step: BookingStep; onSeats?: () => void }) {
  const tab = 'flex flex-1 items-center justify-center rounded-full px-4 py-2.5 text-xs font-semibold';
  return (
    <div className="flex w-full gap-2 rounded-full bg-surface" role="list" aria-label="Booking steps">
      {step === 'seats' ? (
        <span role="listitem" aria-current="step" className={clsx(tab, 'bg-accent')}>SEATS</span>
      ) : (
        <button type="button" role="listitem" onClick={onSeats} className={clsx(tab, 'cursor-pointer hover:bg-surface-3')}>
          SEATS
        </button>
      )}
      <span role="listitem" aria-current={step === 'checkout' ? 'step' : undefined} className={clsx(tab, step === 'checkout' && 'bg-accent')}>
        CHECKOUT
      </span>
    </div>
  );
}
