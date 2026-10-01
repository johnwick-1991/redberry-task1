import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth';
import { useAuthModal } from '@/store/authModal';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Don't open the login modal on 401 (used for /login itself and the boot /me check). */
    skipAuthRedirect?: boolean;
    _retried?: boolean;
  }
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'https://api.kinoxii.redberryinternship.ge/api',
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * 401 on a protected call means the session is gone. Instead of failing,
 * the original request is parked, the login modal opens, and once the user
 * logs in the request is replayed with the new token. The caller's promise
 * simply resolves late, so the user never has to click the same button twice.
 * If they dismiss the modal, the original 401 is rejected as usual.
 */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig | undefined;
    if (error.response?.status !== 401 || !config || config.skipAuthRedirect || config._retried) {
      return Promise.reject(error);
    }

    const hadSession = useAuthStore.getState().token !== null;
    useAuthStore.getState().clear();

    return new Promise((resolve, reject) => {
      useAuthModal.getState().openLogin({
        notice: hadSession ? 'Your session has expired. Please log in again.' : undefined,
        pending: {
          onSuccess: () => {
            config._retried = true;
            api.request(config).then(resolve, reject);
          },
          onCancel: () => reject(error),
        },
      });
    });
  },
);
