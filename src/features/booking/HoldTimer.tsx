import clsx from 'clsx';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { formatCountdown } from '@/lib/format';

/**
 * Seconds left until `expiresAt`. Computed from the server's timestamp on
 * every tick (not by decrementing), so a slow render or a background tab
 * can't make it drift. Calls onExpire once when it reaches zero.
 */
export function useCountdown(expiresAt: string | null, onExpire: () => void): number {
  const target = expiresAt ? new Date(expiresAt).getTime() : null;
  const calc = () => (target === null ? 0 : Math.max(0, Math.ceil((target - Date.now()) / 1000)));
  const [seconds, setSeconds] = useState(calc);
  const onExpireRef = useRef(onExpire);
  useLayoutEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    if (target === null) return;
    let fired = false;
    const tick = () => {
      const left = Math.max(0, Math.ceil((target - Date.now()) / 1000));
      setSeconds(left);
      if (left === 0 && !fired) {
        fired = true;
        onExpireRef.current();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return seconds;
}

/** "SEATS HELD 7:48" box in the modal header; turns red in the last minute. */
export function HoldTimer({ seconds }: { seconds: number }) {
  const urgent = seconds <= 60;
  return (
    <div
      role="timer"
      aria-live={urgent ? 'assertive' : 'off'}
      aria-label={`Seats held for ${formatCountdown(seconds)}`}
      className={clsx(
        'flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-3.5 py-2 leading-none',
        urgent ? 'animate-pulse bg-tint-red' : 'bg-surface',
      )}
    >
      <span className="text-xs font-semibold text-muted">SEATS HELD</span>
      <span className={clsx('text-sm font-extrabold tabular-nums', urgent && 'text-accent')}>{formatCountdown(seconds)}</span>
    </div>
  );
}
