import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { register as registerAccount } from '@/api/endpoints';
import { useAuthStore } from '@/store/auth';
import { useAuthModal } from '@/store/authModal';
import { applyServerErrors } from '@/lib/form';
import { registerSchema, type RegisterValues } from '@/lib/validation';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormAlert, TextField } from '@/components/ui/Field';
import { UploadIcon, UserIcon, XIcon } from '@/components/ui/icons';

const FIELDS = ['username', 'email', 'password', 'password_confirmation', 'avatar'] as const;

export function RegisterModal() {
  const { modal, complete, dismiss, switchTo } = useAuthModal();
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();
  const [apiError, setApiError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    reset,
    trigger,
    watch,
    formState: { errors, touchedFields, dirtyFields },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: { username: '', email: '', password: '', password_confirmation: '', avatar: null },
  });

  const avatar = watch('avatar');

  // Preview only valid images; revoke the object URL when it changes.
  useEffect(() => {
    if (!avatar || errors.avatar) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(avatar);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatar, errors.avatar]);

  const mutation = useMutation({
    mutationFn: registerAccount,
    onSuccess: ({ token, user }) => {
      // Registration signs the user in; the profile is still incomplete at this point.
      setSession(token, user);
      queryClient.invalidateQueries();
      resetAll();
      complete();
    },
    onError: (error) => setApiError(applyServerErrors(error, setError, FIELDS)),
  });

  const resetAll = () => {
    reset();
    setApiError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const close = () => {
    if (mutation.isPending) return;
    resetAll();
    dismiss();
  };

  const isValid = (name: keyof RegisterValues) =>
    (touchedFields[name] || dirtyFields[name]) && !errors[name];

  return (
    <Modal open={modal === 'register'} onClose={close} title="Create an account" size="md">
      <form
        noValidate
        onSubmit={handleSubmit((values) => {
          if (mutation.isPending) return;
          setApiError(null);
          mutation.mutate(values);
        })}
        className="flex flex-col gap-4"
      >
        {apiError && <FormAlert>{apiError}</FormAlert>}

        {/* Avatar (optional) with live preview */}
        <div className="flex items-center gap-4">
          <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-surface-2">
            {preview ? (
              <img src={preview} alt="Avatar preview" className="size-full object-cover" />
            ) : (
              <UserIcon className="size-8 text-muted" />
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" icon={<UploadIcon className="size-4" />} onClick={() => fileRef.current?.click()}>
                {avatar ? 'Change avatar' : 'Upload avatar'}
              </Button>
              {avatar && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<XIcon className="size-4" />}
                  onClick={() => {
                    setValue('avatar', null, { shouldValidate: true });
                    if (fileRef.current) fileRef.current.value = '';
                  }}
                >
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-muted">Optional · JPG, PNG or WebP, up to 2MB</p>
            {errors.avatar?.message && (
              <p role="alert" className="text-xs text-bad">
                {errors.avatar.message}
              </p>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              setValue('avatar', file, { shouldValidate: true, shouldDirty: true });
            }}
          />
        </div>

        <TextField
          id="reg-username"
          label="Username"
          required
          autoComplete="username"
          error={errors.username?.message}
          valid={!!isValid('username')}
          {...register('username')}
        />
        <TextField
          id="reg-email"
          label="Email"
          type="email"
          required
          autoComplete="email"
          error={errors.email?.message}
          valid={!!isValid('email')}
          {...register('email')}
        />
        <div className="grid grid-cols-2 gap-4">
          <TextField
            id="reg-password"
            label="Password"
            type="password"
            required
            autoComplete="new-password"
            error={errors.password?.message}
            valid={!!isValid('password')}
            {...register('password', {
              // Re-check the confirmation when the password changes after it was filled.
              onChange: () => touchedFields.password_confirmation && trigger('password_confirmation'),
            })}
          />
          <TextField
            id="reg-password-confirm"
            label="Confirm Password"
            type="password"
            required
            autoComplete="new-password"
            error={errors.password_confirmation?.message}
            valid={!!isValid('password_confirmation')}
            {...register('password_confirmation')}
          />
        </div>

        <Button type="submit" size="lg" loading={mutation.isPending} className="mt-1 w-full">
          Sign Up
        </Button>

        <p className="text-center text-sm text-muted">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => {
              resetAll();
              switchTo('login');
            }}
            className="cursor-pointer font-semibold text-accent hover:underline"
          >
            Log In
          </button>
        </p>
        <Button variant="ghost" onClick={close} className="-mt-2 w-full">
          Close
        </Button>
      </form>
    </Modal>
  );
}
