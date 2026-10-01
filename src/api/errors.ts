import { isAxiosError } from 'axios';

/**
 * Every API failure is normalised into one of these shapes so components
 * never have to inspect raw axios errors.
 *
 * The API uses two different 422 bodies:
 *  - `errors` present  -> field validation, map each key onto its input
 *  - `message` only    -> a booking rule blocked it, show the message as-is
 */
export type ApiError =
  | { kind: 'validation'; message: string; fields: Record<string, string> }
  | { kind: 'rule'; message: string }
  | { kind: 'conflict'; message: string; contested: string[] }
  | { kind: 'unauthenticated'; message: string }
  | { kind: 'forbidden'; message: string }
  | { kind: 'notFound'; message: string }
  | { kind: 'server'; message: string }
  | { kind: 'network'; message: string };

interface ErrorBody {
  message?: string;
  errors?: Record<string, string[] | string>;
  contested?: string[];
}

const GENERIC = 'Something went wrong. Please try again.';

export function parseApiError(error: unknown): ApiError {
  if (!isAxiosError<ErrorBody>(error)) {
    return { kind: 'network', message: GENERIC };
  }
  if (!error.response) {
    return { kind: 'network', message: 'Network error. Check your connection and try again.' };
  }

  const { status, data } = error.response;
  const message = data?.message || GENERIC;

  switch (status) {
    case 401:
      return { kind: 'unauthenticated', message };
    case 403:
      return { kind: 'forbidden', message };
    case 404:
      return { kind: 'notFound', message };
    case 409:
      return { kind: 'conflict', message, contested: data?.contested ?? [] };
    case 422: {
      if (data?.errors && Object.keys(data.errors).length > 0) {
        const fields: Record<string, string> = {};
        for (const [key, value] of Object.entries(data.errors)) {
          fields[key] = Array.isArray(value) ? value[0] : value;
        }
        return { kind: 'validation', message, fields };
      }
      return { kind: 'rule', message };
    }
    default:
      return { kind: 'server', message: status >= 500 ? GENERIC : message };
  }
}

/** Human readable message for any error, for banners and toasts. */
export function errorMessage(error: unknown): string {
  const parsed = parseApiError(error);
  if (parsed.kind === 'validation') {
    return Object.values(parsed.fields)[0] ?? parsed.message;
  }
  return parsed.message;
}
