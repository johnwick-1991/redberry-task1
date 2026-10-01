import { z } from 'zod';
import { parseISODate } from './format';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const email = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .regex(EMAIL, 'Please enter a valid email address');

const password = z
  .string()
  .min(1, 'Password is required')
  .min(3, 'Password must be at least 3 characters');

const fullName = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .min(3, 'Name must be at least 3 characters')
  .max(50, 'Name must not exceed 50 characters');

/** Georgian mobile: 9 digits starting with 5. Spaces allowed ("5XX XXX XXX"). */
export const mobileNumber = z.string().superRefine((raw, ctx) => {
  const value = raw.replace(/\s+/g, '');
  const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
  if (!value) return fail('Mobile number is required');
  if (!/^\d+$/.test(value)) return fail('Please enter a valid Georgian mobile number (9 digits starting with 5)');
  if (!value.startsWith('5')) return fail('Georgian mobile numbers must start with 5');
  if (value.length !== 9) return fail('Mobile number must be exactly 9 digits');
});

export function ageOn(dob: Date, today = new Date()): number {
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

const dateOfBirth = z.string().superRefine((value, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
  if (!value) return fail('Date of birth is required');
  const dob = parseISODate(value);
  if (Number.isNaN(dob.getTime()) || dob > new Date()) return fail('Please enter a valid date of birth');
  if (ageOn(dob) < 12) return fail('You must be at least 12 years old to create an account');
});

// ---------- Auth ----------
export const loginSchema = z.object({ email, password });
export type LoginValues = z.infer<typeof loginSchema>;

export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(1, 'Username is required')
      .min(3, 'Username must be at least 3 characters'),
    email,
    password,
    password_confirmation: z.string().min(1, 'Please confirm your password'),
    avatar: z
      .instanceof(File)
      .nullable()
      .optional()
      .refine((f) => !f || AVATAR_TYPES.includes(f.type), 'Avatar must be a JPG, PNG or WebP image')
      .refine((f) => !f || f.size <= AVATAR_MAX_BYTES, 'Avatar must be 2MB or smaller'),
  })
  .refine((v) => v.password === v.password_confirmation, {
    path: ['password_confirmation'],
    message: 'Passwords do not match',
    // Run even while other fields are still invalid, so the mismatch shows on blur.
    when: () => true,
  });
export type RegisterValues = z.infer<typeof registerSchema>;

// ---------- Profile ----------
export const profileSchema = z.object({
  fullName,
  mobileNumber,
  dateOfBirth,
  preferredVenueId: z.string(),
});
export type ProfileValues = z.infer<typeof profileSchema>;

// ---------- Checkout ----------
function isFutureExpiry(value: string): boolean {
  const match = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;
  // A card is valid through the last day of its expiry month.
  return new Date(year, month, 1) > new Date();
}

export const checkoutSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .min(3, 'Name must be at least 3 characters'),
  email,
  mobileNumber,
  cardNumber: z
    .string()
    .min(1, 'Card number is required')
    .refine((v) => /^\d{16}$/.test(v.replace(/\s+/g, '')), 'Card number must be 16 digits'),
  expiry: z
    .string()
    .min(1, 'Expiry date is required')
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Use the MM/YY format')
    .refine(isFutureExpiry, 'Card has expired'),
  cvv: z
    .string()
    .min(1, 'CVV is required')
    .regex(/^\d{3}$/, 'CVV must be 3 digits'),
});
export type CheckoutValues = z.infer<typeof checkoutSchema>;
