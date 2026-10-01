import clsx from 'clsx';
import type { InputHTMLAttributes, ReactNode, Ref, SelectHTMLAttributes } from 'react';
import { CheckIcon } from './icons';

interface FieldShellProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  valid?: boolean;
  hint?: ReactNode;
  children: ReactNode;
}

/** Label + control + inline error. Valid: green border and check. Invalid: red border and message. */
function FieldShell({ id, label, required, error, hint, children }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {required && <span className="ml-0.5 text-accent">*</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-bad">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}

const controlClass = (error?: string, valid?: boolean) =>
  clsx(
    'h-11 w-full rounded-lg border bg-surface-2 px-3.5 text-sm text-ink placeholder:text-muted/70 outline-none transition-colors',
    'focus:border-ink/40 disabled:cursor-not-allowed disabled:opacity-60',
    error ? 'border-bad focus:border-bad' : valid ? 'border-ok/70' : 'border-line',
  );

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  valid?: boolean;
  hint?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

export function TextField({ id, label, error, valid, hint, required, className, ref, ...rest }: TextFieldProps) {
  return (
    <FieldShell id={id} label={label} required={required} error={error} valid={valid} hint={hint}>
      <div className="relative">
        <input
          id={id}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={clsx(controlClass(error, valid), valid && !error && 'pr-10', className)}
          {...rest}
        />
        {valid && !error && (
          <CheckIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ok" />
        )}
      </div>
    </FieldShell>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  label: string;
  error?: string;
  valid?: boolean;
  hint?: ReactNode;
  ref?: Ref<HTMLSelectElement>;
}

export function SelectField({ id, label, error, valid, hint, required, children, ref, ...rest }: SelectFieldProps) {
  return (
    <FieldShell id={id} label={label} required={required} error={error} valid={valid} hint={hint}>
      <select id={id} ref={ref} className={clsx(controlClass(error, valid), 'cursor-pointer')} {...rest}>
        {children}
      </select>
    </FieldShell>
  );
}

/** Inline alert box used for API errors inside forms and modals. */
export function FormAlert({
  tone = 'error',
  children,
}: {
  tone?: 'error' | 'warning' | 'info' | 'success';
  children: ReactNode;
}) {
  const tones = {
    error: 'border-bad/40 bg-bad/10 text-bad',
    warning: 'border-warn/40 bg-warn/10 text-warn',
    info: 'border-line bg-surface-2 text-ink',
    success: 'border-ok/40 bg-ok/10 text-ok',
  };
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={clsx('rounded-lg border px-4 py-3 text-sm', tones[tone])}>
      {children}
    </div>
  );
}
