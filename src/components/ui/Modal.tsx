import clsx from 'clsx';
import { useEffect, useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { XIcon } from './icons';

/** Open modals, bottom to top. Escape only closes the top one. */
const stack: string[] = [];

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Rendered above the body, under the title (e.g. booking session info). */
  header?: ReactNode;
  className?: string;
}

const widths = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-3xl',
  xl: 'max-w-6xl',
};

/**
 * Shared modal behaviour for the whole app: dimmed + blurred backdrop,
 * closes on the X button, Escape, or a click on the overlay.
 */
export function Modal({ open, onClose, title, children, footer, size = 'md', header, className }: ModalProps) {
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
      className="fixed inset-0 z-50 flex animate-fade-in items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center sm:p-8"
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
          'relative my-auto w-full animate-pop-in rounded-2xl border border-line bg-surface shadow-2xl outline-none',
          widths[size],
          className,
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 cursor-pointer rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-3 hover:text-ink"
        >
          <XIcon />
        </button>
        {title && (
          <div className="px-6 pt-6 pr-14">
            <h2 id={`${id}-title`} className="text-xl font-bold">
              {title}
            </h2>
          </div>
        )}
        {header}
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
