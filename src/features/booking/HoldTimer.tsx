import clsx from 'clsx';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { formatCountdown } from '@/lib/format';
import { ClockIcon } from '@/components/ui/icons';

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

export function HoldTimer({ seconds }: { seconds: number }) {
  const urgent = seconds <= 60;
  return (
    <div
      role="timer"
      aria-live={urgent ? 'assertive' : 'off'}
      aria-label={`Seats held for ${formatCountdown(seconds)}`}
      className={clsx(
        'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold tabular-nums',
        urgent ? 'animate-pulse border-bad/50 bg-bad/10 text-bad' : 'border-warn/40 bg-warn/10 text-warn',
      )}
    >
      <ClockIcon className="size-4" />
      Seats held · {formatCountdown(seconds)}
    </div>
  );
}
