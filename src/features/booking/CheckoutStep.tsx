import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import type { Order, SeatHold, Session, User } from '@/api/types';
import { createOrder } from '@/api/endpoints';
import { parseApiError } from '@/api/errors';
import { applyServerErrors } from '@/lib/form';
import { formatPrice, formatShortDate } from '@/lib/format';
import { checkoutSchema, type CheckoutValues } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { FormAlert, TextField } from '@/components/ui/Field';
import { StepTabs } from './StepTabs';

const FIELDS = ['fullName', 'email', 'mobileNumber', 'cardNumber', 'expiry', 'cvv'] as const;

/** 4242424242424242 -> "4242 4242 4242 4242" */
const formatCard = (v: string) =>
  v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');

/** "0930" -> "09/30" */
const formatExpiry = (v: string) => {
  const digits = v.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

interface CheckoutStepProps {
  hold: SeatHold;
  session: Session;
  user: User;
  onBack: () => void;
  onPaid: (order: Order) => void;
  onExpired: () => void;
  onContested: (codes: string[], message: string) => void;
}

export function CheckoutStep({
  hold,
  session,
  user,
  onBack,
  onPaid,
  onExpired,
  onContested,
}: CheckoutStepProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, touchedFields, dirtyFields },
  } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    // Buyer details prefilled from the profile.
    defaultValues: {
      fullName: user.fullName ?? '',
      email: user.email,
      mobileNumber: user.mobileNumber ?? '',
      cardNumber: '',
      expiry: '',
      cvv: '',
    },
  });

  const mutation = useMutation({
    mutationFn: createOrder,
    onSuccess: onPaid,
    onError: (error) => {
      const parsed = parseApiError(error);
      if (parsed.kind === 'conflict') return onContested(parsed.contested, parsed.message);
      // 422 without field errors here means the hold ran out.
      if (parsed.kind === 'rule') return onExpired();
      setFormError(applyServerErrors(error, setError, FIELDS));
    },
  });

  const prefilled: Partial<Record<keyof CheckoutValues, boolean>> = {
    fullName: !!user.fullName,
    email: !!user.email,
    mobileNumber: !!user.mobileNumber,
  };
  const isValid = (name: keyof CheckoutValues) =>
    (touchedFields[name] || dirtyFields[name] || prefilled[name]) && !errors[name];

  // "2 x Adult, 1 x Child"
  const counts = new Map<string, number>();
  hold.seats.forEach((s) => counts.set(s.ticketType.name, (counts.get(s.ticketType.name) ?? 0) + 1));
  const ticketLine = [...counts].map(([name, n]) => `${n} x ${name}`).join(', ');

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => {
        if (mutation.isPending) return; // no double submission
        setFormError(null);
        mutation.mutate({ holdId: hold.holdId, ...values });
      })}
      className="grid grid-cols-[720px_1px_1fr] gap-5"
    >
      <div className="flex flex-col gap-6">
        <StepTabs step="checkout" onSeats={mutation.isPending ? undefined : onBack} />
        {formError && <FormAlert>{formError}</FormAlert>}

        <div className="flex flex-col gap-6">
          <TextField
            id="co-name"
            label="Full name"
            required
            autoComplete="name"
            placeholder="e.g. Meri Sanikidze"
            error={errors.fullName?.message}
            valid={!!isValid('fullName')}
            {...register('fullName')}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              id="co-email"
              label="Email"
              type="email"
              required
              autoComplete="email"
              placeholder="e.g. name@example.com"
              error={errors.email?.message}
              valid={!!isValid('email')}
              {...register('email')}
            />
            <TextField
              id="co-mobile"
              label="Mobile number"
              type="tel"
              required
              placeholder="e.g. 555 123 456"
              autoComplete="tel-national"
              error={errors.mobileNumber?.message}
              valid={!!isValid('mobileNumber')}
              {...register('mobileNumber')}
            />
          </div>
        </div>

        <div className="h-px bg-surface" />

        <div className="flex flex-col gap-6">
          <TextField
            id="co-card"
            label="Card number"
            required
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="e.g. 1234 4567 8901 2345"
            error={errors.cardNumber?.message}
            valid={!!isValid('cardNumber')}
            {...register('cardNumber', {
              onChange: (e) => setValue('cardNumber', formatCard(e.target.value)),
            })}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              id="co-expiry"
              label="Expiry"
              required
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="e.g. 12/34"
              error={errors.expiry?.message}
              valid={!!isValid('expiry')}
              {...register('expiry', {
                onChange: (e) => setValue('expiry', formatExpiry(e.target.value)),
              })}
            />
            <TextField
              id="co-cvv"
              label="CVV"
              required
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="e.g. 123"
              maxLength={3}
              error={errors.cvv?.message}
              valid={!!isValid('cvv')}
              {...register('cvv', {
                onChange: (e) => setValue('cvv', e.target.value.replace(/\D/g, '').slice(0, 3)),
              })}
            />
          </div>
        </div>
      </div>

      <div className="bg-surface" />

      <aside className="flex min-w-0 flex-col gap-3">
        <h3 className="text-sm font-extrabold">Summary</h3>
        <div className="flex flex-col gap-2.5 rounded-xl bg-surface p-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-extrabold uppercase">{session.movie?.title}</p>
            <p className="text-xs text-muted">
              Hall {session.hall.name} · {formatShortDate(session.date)} · {session.time}
            </p>
          </div>
          <div className="h-px bg-surface-3" />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">Seats</span>
            <span className="font-semibold">{hold.seats.map((s) => s.code).join(', ')}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">Tickets</span>
            <span>{ticketLine}</span>
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-3 pt-2.5">
          <div className="flex items-center justify-between px-[5px]">
            <span className="text-xs font-semibold">SUBTOTAL</span>
            <span className="text-2xl font-extrabold">{formatPrice(hold.subtotal)}</span>
          </div>
          <Button type="submit" loading={mutation.isPending} className="w-full">
            {mutation.isPending ? 'Processing payment…' : 'Pay: Complete order'}
          </Button>
          <Button variant="ghost" size="sm" onClick={onBack} disabled={mutation.isPending} className="w-full">
            Back
          </Button>
        </div>
      </aside>
    </form>
  );
}
