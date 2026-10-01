import clsx from 'clsx';
import { useToasts } from '@/store/toast';
import { XIcon } from './icons';

const tones = {
  info: 'border-line bg-surface-2',
  success: 'border-ok/50 bg-surface-2',
  warning: 'border-warn/60 bg-surface-2',
  error: 'border-bad/60 bg-surface-2',
};

const dots = {
  info: 'bg-muted',
  success: 'bg-ok',
  warning: 'bg-warn',
  error: 'bg-bad',
};

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[60] flex w-full max-w-sm flex-col gap-2" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={clsx(
            'pointer-events-auto flex animate-pop-in items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-xl',
            tones[t.tone],
          )}
        >
          <span className={clsx('mt-1.5 size-2 shrink-0 rounded-full', dots[t.tone])} />
          <p className="flex-1">{t.message}</p>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            className="cursor-pointer text-muted hover:text-ink"
            aria-label="Dismiss"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
