import clsx from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'light';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Shows a spinner and disables the button so a double click can't submit twice. */
  loading?: boolean;
  icon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-hover disabled:bg-disabled disabled:text-muted',
  secondary: 'bg-tint-white text-ink hover:bg-white/15 disabled:opacity-40',
  ghost: 'text-ink hover:bg-tint-white disabled:opacity-40',
  danger: 'bg-tint-white text-ink hover:bg-tint-red hover:text-accent disabled:opacity-40',
  light: 'bg-white text-bg hover:bg-white/90 disabled:opacity-40',
};

const sizes: Record<Size, string> = {
  sm: 'px-[22px] py-[10px] text-sm',
  md: 'px-[22px] py-[13px] text-sm',
  lg: 'px-[28px] py-[15px] text-base',
};

/** Same look as Button, for router links that should read as buttons. */
export function buttonClasses(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return clsx(
    'inline-flex cursor-pointer items-center justify-center gap-1 rounded-full font-extrabold leading-none whitespace-nowrap transition-colors',
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
        'inline-flex cursor-pointer items-center justify-center gap-1 rounded-full font-extrabold leading-none whitespace-nowrap transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'disabled:cursor-not-allowed',
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
