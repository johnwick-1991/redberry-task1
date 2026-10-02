import clsx from 'clsx';
import type { InputHTMLAttributes, ReactNode, Ref, SelectHTMLAttributes } from 'react';
import { ChevronDown, FigmaIcon } from './icons';

interface FieldShellProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}

/** Label + control + inline error, as in the Figma "Input" component. */
function FieldShell({ id, label, error, hint, children }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2.5">
        <label htmlFor={id} className={clsx('text-xs font-semibold', error ? 'text-bad' : 'text-ink')}>
          {label}
        </label>
        {children}
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-semibold text-bad">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs font-semibold text-muted">{hint}</p>
      )}
    </div>
  );
}

const controlClass = (error?: string) =>
  clsx(
    'h-10 w-full rounded-xl border bg-surface px-4 text-xs font-semibold text-ink placeholder:text-muted outline-none transition-colors',
    'disabled:cursor-not-allowed disabled:text-muted',
    error ? 'border-bad' : 'border-transparent focus:border-disabled',
  );

/** Valid: green check. Invalid: red warning mark. */
function StateIcon({ error, valid }: { error?: string; valid?: boolean }) {
  if (error) return <FigmaIcon name="check" className="pointer-events-none absolute right-4 top-1/2 size-3 -translate-y-1/2 text-bad" />;
  if (valid) return <FigmaIcon name="confirm" className="pointer-events-none absolute right-4 top-1/2 size-3.5 -translate-y-1/2 text-ok" />;
  return null;
}

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
    <FieldShell id={id} label={label} required={required} error={error} hint={hint}>
      <div className="relative">
        <input
          id={id}
          ref={ref}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={clsx(controlClass(error), (error || valid) && 'pr-10', className)}
          {...rest}
        />
        <StateIcon error={error} valid={valid} />
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

export function SelectField({ id, label, error, hint, required, children, ref, ...rest }: SelectFieldProps) {
  return (
    <FieldShell id={id} label={label} required={required} error={error} hint={hint}>
      <div className="relative">
        <select id={id} ref={ref} className={clsx(controlClass(error), 'cursor-pointer appearance-none pr-10')} {...rest}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-ink" />
      </div>
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
    error: 'bg-tint-red text-bad',
    warning: 'bg-tint-warn text-warn',
    info: 'bg-surface text-ink',
    success: 'bg-ok/10 text-ok',
  };
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={clsx('rounded-xl px-4 py-3 text-xs font-semibold', tones[tone])}>
      {children}
    </div>
  );
}
