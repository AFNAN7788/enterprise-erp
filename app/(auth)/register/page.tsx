'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { createProfileAction } from '@/app/actions/auth';

type FormState = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

function validateForm(values: FormState): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.fullName.trim()) {
    errors.fullName = 'Full name is required.';
  }

  if (!values.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!values.password) {
    errors.password = 'Password is required.';
  } else if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.';
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
}

export default function RegisterPage() {
  const [form, setForm] = useState<FormState>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof FormState]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);

    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        form.email.trim(),
        form.password
      );

      const user = userCredential.user;

      // Ensure auth state is fully propagated before Firestore write
      await user.getIdToken();

      // Update display name in Firebase Auth
      await updateProfile(user, { displayName: form.fullName.trim() });

      // Send email verification
      await sendEmailVerification(user);

      // Create profile in Firestore via server action (Admin SDK)
      await createProfileAction(user.uid, form.email.trim(), form.fullName.trim());

      setIsSuccess(true);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      const message = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
      if (code === 'auth/email-already-in-use') {
        setServerError('This email is already registered. Please sign in instead.');
      } else if (code === 'auth/weak-password') {
        setServerError('Password is too weak. Please choose a stronger password.');
      } else if (code === 'auth/invalid-email') {
        setServerError('Please enter a valid email address.');
      } else if (code === 'auth/operation-not-allowed') {
        setServerError('Email/password accounts are not enabled. Please contact support.');
      } else {
        setServerError(message);
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (isSuccess) {
    return (
      <div className="text-center">
        <div
          aria-hidden="true"
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900"
        >
          <svg
            className="h-6 w-6 text-green-600 dark:text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          Check your email
        </h1>
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">
          We sent a verification link to{' '}
          <strong className="font-medium text-[var(--foreground)]">
            {form.email}
          </strong>
          . Please verify your email before logging in.
        </p>
        <p className="mt-6 text-sm text-[var(--muted-foreground)]">
          Already verified?{' '}
          <Link
            href="/login"
            className="font-medium text-[var(--foreground)] underline underline-offset-4 hover:opacity-75"
          >
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-xl font-semibold text-[var(--foreground)] mb-6">
        Create an account
      </h2>

      {serverError && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
        >
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate aria-label="Create account form">
        {/* Full Name */}
        <div className="mb-5">
          <label
            htmlFor="fullName"
            className="mb-1.5 block text-sm font-medium text-[var(--foreground)]"
          >
            Full name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            value={form.fullName}
            onChange={handleChange}
            disabled={isLoading}
            aria-describedby={fieldErrors.fullName ? 'fullName-error' : undefined}
            aria-invalid={!!fieldErrors.fullName}
            placeholder="Jane Doe"
            className={`w-full rounded-md border px-3 py-2 text-sm bg-[var(--background)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none transition focus:ring-2 focus:ring-[var(--ring)] disabled:opacity-50 ${
              fieldErrors.fullName
                ? 'border-red-500 focus:ring-red-400'
                : 'border-[var(--input)] focus:border-[var(--ring)]'
            }`}
          />
          {fieldErrors.fullName && (
            <p id="fullName-error" role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
              {fieldErrors.fullName}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="mb-5">
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-[var(--foreground)]"
          >
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            disabled={isLoading}
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            aria-invalid={!!fieldErrors.email}
            placeholder="jane@company.com"
            className={`w-full rounded-md border px-3 py-2 text-sm bg-[var(--background)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none transition focus:ring-2 focus:ring-[var(--ring)] disabled:opacity-50 ${
              fieldErrors.email
                ? 'border-red-500 focus:ring-red-400'
                : 'border-[var(--input)] focus:border-[var(--ring)]'
            }`}
          />
          {fieldErrors.email && (
            <p id="email-error" role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
              {fieldErrors.email}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="mb-5">
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-[var(--foreground)]"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange}
            disabled={isLoading}
            aria-describedby={fieldErrors.password ? 'password-error' : 'password-hint'}
            aria-invalid={!!fieldErrors.password}
            placeholder="Min. 8 characters"
            className={`w-full rounded-md border px-3 py-2 text-sm bg-[var(--background)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none transition focus:ring-2 focus:ring-[var(--ring)] disabled:opacity-50 ${
              fieldErrors.password
                ? 'border-red-500 focus:ring-red-400'
                : 'border-[var(--input)] focus:border-[var(--ring)]'
            }`}
          />
          {fieldErrors.password ? (
            <p id="password-error" role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
              {fieldErrors.password}
            </p>
          ) : (
            <p id="password-hint" className="mt-1.5 text-xs text-[var(--muted-foreground)]">
              Must be at least 8 characters.
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="mb-6">
          <label
            htmlFor="confirmPassword"
            className="mb-1.5 block text-sm font-medium text-[var(--foreground)]"
          >
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={handleChange}
            disabled={isLoading}
            aria-describedby={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}
            aria-invalid={!!fieldErrors.confirmPassword}
            placeholder="Re-enter your password"
            className={`w-full rounded-md border px-3 py-2 text-sm bg-[var(--background)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none transition focus:ring-2 focus:ring-[var(--ring)] disabled:opacity-50 ${
              fieldErrors.confirmPassword
                ? 'border-red-500 focus:ring-red-400'
                : 'border-[var(--input)] focus:border-[var(--ring)]'
            }`}
          />
          {fieldErrors.confirmPassword && (
            <p id="confirmPassword-error" role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
              {fieldErrors.confirmPassword}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          aria-busy={isLoading}
          className="w-full rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-medium py-2.5 px-4 transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-medium text-[var(--foreground)] underline underline-offset-4 hover:opacity-75"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
