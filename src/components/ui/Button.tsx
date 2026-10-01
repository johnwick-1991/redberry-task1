import clsx from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Shows a spinner and disables the button so a double click can't submit twice. */
  loading?: boolean;
  icon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-hover shadow-lg shadow-accent/20',
  secondary: 'bg-surface-3 text-ink hover:bg-line border border-line',
  ghost: 'text-ink hover:bg-surface-3',
  danger: 'bg-transparent text-bad border border-bad/50 hover:bg-bad/10',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

/** Same look as Button, for router links that should read as buttons. */
export function buttonClasses(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return clsx(
    'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-semibold transition-colors',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  icon,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-semibold transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner className="size-4" /> : icon}
      {children}
    </button>
  );
}
