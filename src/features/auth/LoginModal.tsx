import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { login } from '@/api/endpoints';
import { parseApiError } from '@/api/errors';
import { useAuthStore } from '@/store/auth';
import { useAuthModal } from '@/store/authModal';
import { applyServerErrors } from '@/lib/form';
import { loginSchema, type LoginValues } from '@/lib/validation';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormAlert, TextField } from '@/components/ui/Field';

export function LoginModal() {
  const { modal, notice, complete, dismiss, switchTo } = useAuthModal();
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, touchedFields, dirtyFields },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: { email: '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: ({ token, user }) => {
      setSession(token, user);
      // isNotified / isMine / tickets depend on who is signed in.
      queryClient.invalidateQueries();
      reset();
      setApiError(null);
      complete();
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      // Keep the modal open and the email filled in; show the API message inside.
      if (parsed.kind === 'unauthenticated') setApiError(parsed.message);
      else setApiError(applyServerErrors(error, setError, ['email', 'password']));
    },
  });

  const close = () => {
    if (mutation.isPending) return;
    setApiError(null);
    reset();
    dismiss();
  };

  const isValid = (name: keyof LoginValues) => (touchedFields[name] || dirtyFields[name]) && !errors[name];

  return (
    <Modal open={modal === 'login'} onClose={close} title="Log in" size="sm">
      <form
        noValidate
        onSubmit={handleSubmit((values) => {
          if (mutation.isPending) return;
          setApiError(null);
          mutation.mutate(values);
        })}
        className="flex flex-col gap-4"
      >
        {notice && <FormAlert tone="warning">{notice}</FormAlert>}
        {apiError && <FormAlert>{apiError}</FormAlert>}

        <TextField
          id="login-email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          error={errors.email?.message}
          valid={!!isValid('email')}
          {...register('email')}
        />
        <TextField
          id="login-password"
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          error={errors.password?.message}
          valid={!!isValid('password')}
          {...register('password')}
        />

        <Button type="submit" size="lg" loading={mutation.isPending} className="mt-1 w-full">
          Log In
        </Button>

        <p className="text-center text-sm text-muted">
          Don&apos;t have an account?{' '}
          <button
            type="button"
            onClick={() => {
              setApiError(null);
              switchTo('register');
            }}
            className="cursor-pointer font-semibold text-accent hover:underline"
          >
            Sign Up
          </button>
        </p>
        <Button variant="ghost" onClick={close} className="-mt-2 w-full">
          Close
        </Button>
      </form>
    </Modal>
  );
}
