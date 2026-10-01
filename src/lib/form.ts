import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { parseApiError } from '@/api/errors';

/**
 * Puts a 422 `errors` body onto the matching inputs. Returns the message to
 * show in the form banner for anything that couldn't be mapped to a field
 * (rule errors, 500s, network), or null when every error landed on a field.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly string[],
): string | null {
  const parsed = parseApiError(error);
  if (parsed.kind !== 'validation') return parsed.message;

  const leftovers: string[] = [];
  let first = true;
  for (const [field, message] of Object.entries(parsed.fields)) {
    if (knownFields.includes(field)) {
      setError(field as Path<T>, { type: 'server', message }, { shouldFocus: first });
      first = false;
    } else {
      leftovers.push(message);
    }
  }
  return leftovers.length ? leftovers.join(' ') : null;
}
