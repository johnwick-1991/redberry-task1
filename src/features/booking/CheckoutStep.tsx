import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import type { Order, SeatHold, User } from '@/api/types';
import { createOrder } from '@/api/endpoints';
import { parseApiError } from '@/api/errors';
import { applyServerErrors } from '@/lib/form';
import { formatPrice } from '@/lib/format';
import { checkoutSchema, type CheckoutValues } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { FormAlert, TextField } from '@/components/ui/Field';

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
  user: User;
  sectionBySeatId: Map<number, string>;
  onBack: () => void;
  onPaid: (order: Order) => void;
  onExpired: () => void;
  onContested: (codes: string[], message: string) => void;
}

export function CheckoutStep({
  hold,
  user,
  sectionBySeatId,
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

  const isValid = (name: keyof CheckoutValues) =>
    (touchedFields[name] || dirtyFields[name]) && !errors[name];

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => {
        if (mutation.isPending) return; // no double submission
        setFormError(null);
        mutation.mutate({ holdId: hold.holdId, ...values });
      })}
      className="grid grid-cols-[1fr_360px] gap-8"
    >
      <div className="flex flex-col gap-6">
        {formError && <FormAlert>{formError}</FormAlert>}

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">Buyer details</legend>
          <TextField
            id="co-name"
            label="Full Name"
            required
            autoComplete="name"
            error={errors.fullName?.message}
            valid={!!isValid('fullName')}
            {...register('fullName')}
          />
          <div className="grid grid-cols-2 gap-4">
            <TextField
              id="co-email"
              label="Email"
              type="email"
              required
              autoComplete="email"
              error={errors.email?.message}
              valid={!!isValid('email')}
              {...register('email')}
            />
            <TextField
              id="co-mobile"
              label="Mobile Number"
              type="tel"
              required
              placeholder="5XX XXX XXX"
              autoComplete="tel-national"
              error={errors.mobileNumber?.message}
              valid={!!isValid('mobileNumber')}
              {...register('mobileNumber')}
            />
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">Card details</legend>
          <TextField
            id="co-card"
            label="Card Number"
            required
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="4242 4242 4242 4242"
            error={errors.cardNumber?.message}
            valid={!!isValid('cardNumber')}
            {...register('cardNumber', {
              onChange: (e) => setValue('cardNumber', formatCard(e.target.value)),
            })}
          />
          <div className="grid grid-cols-2 gap-4">
            <TextField
              id="co-expiry"
              label="Expiry"
              required
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM/YY"
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
              placeholder="123"
              maxLength={3}
              error={errors.cvv?.message}
              valid={!!isValid('cvv')}
              {...register('cvv', {
                onChange: (e) => setValue('cvv', e.target.value.replace(/\D/g, '').slice(0, 3)),
              })}
            />
          </div>
        </fieldset>
      </div>

      <aside className="flex flex-col rounded-2xl border border-line bg-surface-2 p-5">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted">Order summary</h3>
        <ul className="flex flex-col divide-y divide-line">
          {hold.seats.map((s) => (
            <li key={s.seatId} className="flex items-center justify-between py-2.5 text-sm">
              <span>
                <span className="font-bold">{s.code}</span>
                <span className="text-muted">
                  {' · '}
                  {sectionBySeatId.get(s.seatId) ?? 'Seat'} · {s.ticketType.name}
                </span>
              </span>
              <span className="font-semibold">{formatPrice(s.price)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-line pt-4">
          <span className="font-semibold">Total</span>
          <span className="text-2xl font-extrabold">{formatPrice(hold.subtotal)}</span>
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-6">
          <Button type="submit" size="lg" loading={mutation.isPending} className="w-full">
            {mutation.isPending ? 'Processing payment…' : 'Pay & Complete Order'}
          </Button>
          <Button variant="ghost" onClick={onBack} disabled={mutation.isPending} className="w-full">
            Back
          </Button>
        </div>
      </aside>
    </form>
  );
}
