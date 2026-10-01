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
import { AlertIcon, CheckIcon } from '@/components/ui/icons';

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
    <section className="rounded-2xl border border-line bg-surface p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold">Personal Information</h2>
        {user.profileComplete ? (
          <span className="flex items-center gap-1.5 rounded-full border border-ok/40 bg-ok/10 px-3 py-1 text-sm font-semibold text-ok">
            Profile Complete <CheckIcon className="size-4" strokeWidth={3} />
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full border border-warn/40 bg-warn/10 px-3 py-1 text-sm font-semibold text-warn">
            <span className="size-2 rounded-full bg-warn" /> Incomplete
          </span>
        )}
      </div>

      {!user.profileComplete && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          <AlertIcon className="size-5 shrink-0" />
          {PROFILE_INCOMPLETE_MESSAGE}
        </div>
      )}

      <form
        noValidate
        onSubmit={handleSubmit((values) => {
          if (mutation.isPending) return;
          setFormError(null);
          mutation.mutate(values);
        })}
        className="flex flex-col gap-5"
      >
        {formError && <FormAlert>{formError}</FormAlert>}

        <div className="grid grid-cols-2 gap-5">
          <TextField
            id="pf-name"
            label="Full Name"
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
            hint="Set at registration and can't be changed."
          />
          <TextField
            id="pf-mobile"
            label="Mobile Number"
            required
            type="tel"
            placeholder="5XX XXX XXX"
            autoComplete="tel-national"
            error={errors.mobileNumber?.message}
            valid={!!fieldValid('mobileNumber')}
            {...register('mobileNumber')}
          />
          <TextField
            id="pf-dob"
            label="Date of Birth"
            required
            type="date"
            max={todayISO()}
            error={errors.dateOfBirth?.message}
            valid={!!fieldValid('dateOfBirth')}
            hint="Used to check age-restricted titles."
            {...register('dateOfBirth')}
          />
          <SelectField
            id="pf-venue"
            label="Preferred Venue"
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

        {notice && (
          <p className="rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm text-muted">{notice}</p>
        )}

        <div className="flex items-center justify-end gap-3">
          {isDirty && (
            <Button variant="ghost" onClick={() => reset(toValues(user))} disabled={mutation.isPending}>
              Discard
            </Button>
          )}
          <Button type="submit" loading={mutation.isPending} disabled={!isDirty || !isValid}>
            Save Changes
          </Button>
        </div>
      </form>
    </section>
  );
}
