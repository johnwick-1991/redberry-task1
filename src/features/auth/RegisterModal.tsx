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
    <Modal open={modal === 'register'} onClose={close} title="Sign up" subtitle="Welcome to Kino XII" size="md">
      <form
        noValidate
        onSubmit={handleSubmit((values) => {
          if (mutation.isPending) return;
          setApiError(null);
          mutation.mutate(values);
        })}
        className="flex flex-col gap-6"
      >
        {apiError && <FormAlert>{apiError}</FormAlert>}

        {/* Avatar (optional) with live preview */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label={avatar ? 'Change avatar' : 'Upload avatar'}
            className="grid size-10 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-lg border-[0.5px] border-dashed border-surface-3 bg-tint-white transition-colors hover:bg-white/15"
          >
            {preview ? (
              <img src={preview} alt="Avatar preview" className="size-full object-cover" />
            ) : (
              <img src="/figma/upload.svg" alt="" className="h-[11px] w-3" />
            )}
          </button>
          <div className="flex flex-col gap-[3px]">
            <p className="flex items-center gap-2 text-sm font-extrabold">
              {avatar ? 'Avatar selected' : 'Upload avatar (optional)'}
              {avatar && (
                <button
                  type="button"
                  className="cursor-pointer text-xs font-semibold text-accent hover:underline"
                  onClick={() => {
                    setValue('avatar', null, { shouldValidate: true });
                    if (fileRef.current) fileRef.current.value = '';
                  }}
                >
                  Remove
                </button>
              )}
            </p>
            {errors.avatar?.message ? (
              <p role="alert" className="text-xs text-bad">
                {errors.avatar.message}
              </p>
            ) : (
              <p className="text-xs text-muted">JPG, PNG or WEBP</p>
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
          placeholder="User"
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
          placeholder="example@gmail.com"
          error={errors.email?.message}
          valid={!!isValid('email')}
          {...register('email')}
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            id="reg-password"
            label="Password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="••••••••"
            error={errors.password?.message}
            valid={!!isValid('password')}
            {...register('password', {
              // Re-check the confirmation when the password changes after it was filled.
              onChange: () => touchedFields.password_confirmation && trigger('password_confirmation'),
            })}
          />
          <TextField
            id="reg-password-confirm"
            label="Confirm password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="••••••••"
            error={errors.password_confirmation?.message}
            valid={!!isValid('password_confirmation')}
            {...register('password_confirmation')}
          />
        </div>

        <Button type="submit" loading={mutation.isPending} className="w-full">
          Sign up
        </Button>

        <p className="-mt-1 text-center text-sm text-muted">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => {
              resetAll();
              switchTo('login');
            }}
            className="cursor-pointer font-extrabold text-accent hover:underline"
          >
            Log in
          </button>
        </p>
      </form>
    </Modal>
  );
}
