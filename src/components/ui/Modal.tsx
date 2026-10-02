import clsx from 'clsx';
import { useEffect, useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { FigmaIcon } from './icons';

/** Open modals, bottom to top. Escape only closes the top one. */
const stack: string[] = [];

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  /** Small line under the title ("Welcome back to Kino XII"). */
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Rendered above the body, under the title (e.g. booking session info). */
  header?: ReactNode;
  className?: string;
}

const widths = {
  sm: 'max-w-[403px]',
  md: 'max-w-[475px]',
  lg: 'max-w-3xl',
  xl: 'max-w-[1146px]',
};

/**
 * Shared modal behaviour for the whole app: dimmed + blurred backdrop,
 * closes on the X button, Escape, or a click on the overlay.
 */
export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md', header, className }: ModalProps) {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    stack.push(id);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stack[stack.length - 1] === id) {
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      const index = stack.indexOf(id);
      if (index !== -1) stack.splice(index, 1);
      if (stack.length === 0) document.body.style.overflow = '';
      previouslyFocused?.focus?.();
    };
  }, [open, id]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-start justify-center overflow-y-auto bg-bg/70 p-4 backdrop-blur-md sm:items-center sm:p-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? `${id}-title` : undefined}
        tabIndex={-1}
        className={clsx(
          'relative my-auto flex w-full animate-pop-in flex-col gap-6 rounded-[28px] border border-surface-3 bg-bg p-8 shadow-[0_20px_50px_-10px_rgb(0_0_0/0.2)] outline-none',
          widths[size],
          className,
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-8 top-8 z-10 cursor-pointer text-ink transition-opacity hover:opacity-70"
        >
          <FigmaIcon name="close" className="size-6" />
        </button>
        {title && (
          <div className="flex flex-col gap-2 pr-10">
            <h2 id={`${id}-title`} className="text-xl font-extrabold">
              {title}
            </h2>
            {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
          </div>
        )}
        {header}
        <div>{children}</div>
        {footer && <div>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
