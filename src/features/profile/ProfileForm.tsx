import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import type { User } from '@/api/types';
import { updateProfile } from '@/api/endpoints';
import { useFilterOptions } from '@/api/queries';
import { useAuthStore } from '@/store/auth';
import { toast } from '@/store/toast';
import { applyServerErrors } from '@/lib/form';
import { todayISO } from '@/lib/format';
import { PROFILE_INCOMPLETE_MESSAGE } from '@/lib/guards';
import { profileSchema, type ProfileValues } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { FormAlert, SelectField, TextField } from '@/components/ui/Field';
import { FigmaIcon } from '@/components/ui/icons';

const FIELDS = ['fullName', 'mobileNumber', 'dateOfBirth', 'preferredVenueId'] as const;

const toValues = (u: User): ProfileValues => ({
  fullName: u.fullName ?? '',
  mobileNumber: u.mobileNumber ?? '',
  dateOfBirth: u.dateOfBirth ?? '',
  preferredVenueId: u.preferredVenue ? String(u.preferredVenue.id) : '',
});

/** Which titles this account can book, from the server-derived age. */
function eligibility(age: number | null): string | null {
  if (age === null || age === undefined) return null;
  if (age >= 18) return `You are ${age}, you can buy tickets for all age ratings.`;
  if (age >= 16) return `You are ${age}, you cannot buy tickets for 18+ titles.`;
  return `You are ${age}, you cannot buy tickets for 16+ or 18+ titles.`;
}

export function ProfileForm({ user }: { user: User }) {
  const setUser = useAuthStore((s) => s.setUser);
  const options = useFilterOptions();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty, isValid, touchedFields, dirtyFields },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: toValues(user),
  });

  // Keep the form in sync when the user object is refreshed elsewhere.
  useEffect(() => {
    reset(toValues(user));
  }, [user, reset]);

  const mutation = useMutation({
    mutationFn: (values: ProfileValues) =>
      updateProfile({
        fullName: values.fullName.trim(),
        mobileNumber: values.mobileNumber.replace(/\s+/g, ''),
        dateOfBirth: values.dateOfBirth,
        preferredVenueId: values.preferredVenueId ? Number(values.preferredVenueId) : null,
      }),
    onSuccess: (updated) => {
      // Show what the server stored, not what was typed.
      setUser(updated);
      reset(toValues(updated));
      setFormError(null);
      toast(updated.profileComplete ? 'Profile saved. You can now book tickets.' : 'Profile saved.', 'success');
    },
    onError: (error) => setFormError(applyServerErrors(error, setError, FIELDS)),
  });

  const fieldValid = (name: keyof ProfileValues) =>
    (touchedFields[name] || dirtyFields[name]) && !errors[name];

  const notice = eligibility(user.age);

  return (
    <section className="flex w-[880px] flex-col gap-6">
      {user.profileComplete ? (
        <span className="flex items-center gap-1.5 self-start rounded-lg bg-ok/10 px-3 py-2.5 text-xs font-semibold text-ok">
          Profile Complete <FigmaIcon name="confirm" className="size-3" />
        </span>
      ) : (
        <FormAlert tone="warning">{PROFILE_INCOMPLETE_MESSAGE}</FormAlert>
      )}

      <form
        noValidate
        onSubmit={handleSubmit((values) => {
          if (mutation.isPending) return;
          setFormError(null);
          mutation.mutate(values);
        })}
        className="flex flex-col gap-9"
      >
        {formError && <FormAlert>{formError}</FormAlert>}

        <div className="flex flex-col gap-[18px]">
          <TextField
            id="pf-name"
            label="Full name"
            required
            autoComplete="name"
            error={errors.fullName?.message}
            valid={!!fieldValid('fullName')}
            {...register('fullName')}
          />
          <TextField
            id="pf-email"
            label="Email"
            required
            type="email"
            value={user.email}
            readOnly
            disabled
            hint="Set at registration and cannot be changed"
          />
          <TextField
            id="pf-mobile"
            label="Mobile number"
            required
            type="tel"
            placeholder="e.g. 555 123 456"
            autoComplete="tel-national"
            error={errors.mobileNumber?.message}
            valid={!!fieldValid('mobileNumber')}
            {...register('mobileNumber')}
          />
          <TextField
            id="pf-dob"
            label="Date of birth"
            required
            type="date"
            max={todayISO()}
            error={errors.dateOfBirth?.message}
            valid={!!fieldValid('dateOfBirth')}
            hint={notice ?? undefined}
            {...register('dateOfBirth')}
          />
          <SelectField
            id="pf-venue"
            label="Preferred Venue (Optional)"
            error={errors.preferredVenueId?.message}
            {...register('preferredVenueId')}
          >
            <option value="">No preference</option>
            {options.data?.venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} · {v.city}
              </option>
            ))}
          </SelectField>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" loading={mutation.isPending} disabled={!isDirty || !isValid}>
            Save changes
          </Button>
          {isDirty && (
            <Button variant="ghost" onClick={() => reset(toValues(user))} disabled={mutation.isPending}>
              Discard
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}
