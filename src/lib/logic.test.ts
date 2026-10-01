import { describe, expect, it } from 'vitest';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { parseApiError } from '@/api/errors';
import { checkoutSchema, mobileNumber, profileSchema, registerSchema } from '@/lib/validation';
import { availableFormats } from '@/features/sessions/useSessionsUrlState';
import { isAgeRestricted } from '@/lib/guards';
import type { FilterOptions, User } from '@/api/types';

const firstError = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.success ? null : r.error!.issues[0].message;

function axiosError(status: number, data: unknown) {
  const response = { status, data, headers: {}, config: { headers: new AxiosHeaders() }, statusText: '' } as AxiosResponse;
  return new AxiosError('fail', String(status), undefined, undefined, response);
}

describe('parseApiError', () => {
  it('splits the two shapes of 422', () => {
    expect(parseApiError(axiosError(422, { message: 'x', errors: { email: ['taken'] } }))).toEqual({
      kind: 'validation',
      message: 'x',
      fields: { email: 'taken' },
    });
    expect(parseApiError(axiosError(422, { message: 'Your hold time expired.' }))).toEqual({
      kind: 'rule',
      message: 'Your hold time expired.',
    });
  });

  it('reads contested seats from a 409', () => {
    const e = parseApiError(axiosError(409, { message: 'taken', contested: ['E7', 'E8'] }));
    expect(e).toMatchObject({ kind: 'conflict', contested: ['E7', 'E8'] });
  });
});

describe('Georgian mobile number', () => {
  const check = (v: string) => firstError(mobileNumber.safeParse(v));
  it('uses the exact messages from the brief', () => {
    expect(check('')).toBe('Mobile number is required');
    expect(check('699123456')).toBe('Georgian mobile numbers must start with 5');
    expect(check('59912345')).toBe('Mobile number must be exactly 9 digits');
    expect(check('59912a456')).toBe('Please enter a valid Georgian mobile number (9 digits starting with 5)');
    expect(check('599 123 456')).toBeNull();
    expect(check('599123456')).toBeNull();
  });
});

describe('profile', () => {
  const base = { fullName: 'Jane Doe', mobileNumber: '599123456', dateOfBirth: '1998-05-12', preferredVenueId: '' };
  const err = (patch: object) => firstError(profileSchema.safeParse({ ...base, ...patch }));

  it('validates name length', () => {
    expect(err({ fullName: '' })).toBe('Name is required');
    expect(err({ fullName: 'Jo' })).toBe('Name must be at least 3 characters');
    expect(err({ fullName: 'x'.repeat(51) })).toBe('Name must not exceed 50 characters');
  });

  it('validates date of birth', () => {
    expect(err({ dateOfBirth: '' })).toBe('Date of birth is required');
    expect(err({ dateOfBirth: '2999-01-01' })).toBe('Please enter a valid date of birth');
    const young = new Date();
    young.setFullYear(young.getFullYear() - 10);
    expect(err({ dateOfBirth: young.toISOString().slice(0, 10) })).toBe(
      'You must be at least 12 years old to create an account',
    );
    expect(err({})).toBeNull();
  });
});

describe('register', () => {
  it('flags mismatched passwords even while other fields are empty', () => {
    const r = registerSchema.safeParse({ username: '', email: '', password: 'abc', password_confirmation: 'abd' });
    expect(r.success).toBe(false);
    const paths = r.error!.issues.map((i) => `${i.path.join('.')}:${i.message}`);
    expect(paths).toContain('password_confirmation:Passwords do not match');
  });
});

describe('checkout', () => {
  const base = {
    fullName: 'Jane Doe',
    email: 'jane@kinoxii.test',
    mobileNumber: '599123456',
    cardNumber: '4242 4242 4242 4242',
    expiry: '09/39',
    cvv: '123',
  };
  it('accepts a valid card and rejects a past expiry', () => {
    expect(checkoutSchema.safeParse(base).success).toBe(true);
    expect(firstError(checkoutSchema.safeParse({ ...base, expiry: '01/20' }))).toBe('Card has expired');
    expect(firstError(checkoutSchema.safeParse({ ...base, cardNumber: '4242' }))).toBe('Card number must be 16 digits');
    expect(firstError(checkoutSchema.safeParse({ ...base, cvv: '12' }))).toBe('CVV must be 3 digits');
  });
});

describe('format narrowing', () => {
  const f = (slug: string) => ({ id: 0, slug, name: slug, priceUplift: 0 });
  const options = {
    formats: ['standard', 'max', 'atmos', 'panorama', 'motion'].map(f),
    venues: [
      { id: 1, slug: 'batumi', name: 'B', city: 'B', formats: ['atmos', 'max', 'standard'].map(f) },
      { id: 2, slug: 'vake', name: 'V', city: 'T', formats: ['max', 'motion', 'standard'].map(f) },
    ],
  } as unknown as FilterOptions;

  it('shows every format with no venue, and only shared venue formats otherwise', () => {
    expect(availableFormats(options, []).map((x) => x.slug)).toHaveLength(5);
    expect(availableFormats(options, ['batumi']).map((x) => x.slug)).toEqual(['standard', 'max', 'atmos']);
    expect(availableFormats(options, ['batumi', 'vake']).map((x) => x.slug)).toEqual([
      'standard',
      'max',
      'atmos',
      'motion',
    ]);
  });
});

describe('age gate', () => {
  const user = (age: number) => ({ age }) as User;
  const rating = (minAge: number) => ({ code: `${minAge}+`, minAge, description: '' });
  it('blocks only 16+/18+ titles for younger accounts', () => {
    expect(isAgeRestricted(user(15), rating(16))).toBe(true);
    expect(isAgeRestricted(user(17), rating(18))).toBe(true);
    expect(isAgeRestricted(user(18), rating(18))).toBe(false);
    expect(isAgeRestricted(user(13), rating(12))).toBe(false);
    expect(isAgeRestricted(null, rating(18))).toBe(false);
  });
});
