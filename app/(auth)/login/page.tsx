'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';
import type { Profile } from '@/types';

type UserRole = Profile['role'];

const ROLE_ROUTES: Record<UserRole, string> = {
  admin: '/dashboard/admin',
  hr: '/dashboard/hr',
  manager: '/dashboard/manager',
  employee: '/dashboard',
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  function validate(): boolean {
    let valid = true;

    if (!email.trim()) {
      setEmailError('Email is required.');
      valid = false;
    } else if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address.');
      valid = false;
    } else {
      setEmailError('');
    }

    if (!password) {
      setPasswordError('Password is required.');
      valid = false;
    } else {
      setPasswordError('');
    }

    return valid;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAuthError('');

    if (!validate()) return;

    setIsLoading(true);

    try {
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const user = userCredential.user;

      // Set session cookie for middleware
      const idToken = await user.getIdToken();
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      // Fetch profile from Firestore to get role
      let destination = '/dashboard';
      try {
        const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
        if (profileSnap.exists()) {
          const profile = profileSnap.data() as Pick<Profile, 'role'>;
          destination = ROLE_ROUTES[profile.role] ?? '/dashboard';
        }
      } catch {
        // Profile fetch failed — go to default dashboard
      }

      router.push(destination);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      if (
        code === 'auth/user-not-found' ||
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential'
      ) {
        setAuthError('Invalid email or password. Please try again.');
      } else if (code === 'auth/too-many-requests') {
        setAuthError('Too many attempts. Please try again later.');
      } else {
        setAuthError('An error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <h2 className="text-xl font-semibold text-[var(--foreground)] mb-6">
        Sign in to your account
      </h2>

      <form onSubmit={handleSubmit} noValidate aria-label="Sign in form">
        {/* Auth-level error banner */}
        {authError && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-5 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-300"
          >
            {authError}
          </div>
        )}

        {/* Email field */}
        <div className="mb-4">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-[var(--foreground)] mb-1.5"
          >
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-required="true"
            aria-invalid={emailError ? 'true' : 'false'}
            aria-describedby={emailError ? 'email-error' : undefined}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError('');
            }}
            placeholder="you@example.com"
            className={`w-full rounded-md border px-3 py-2 text-sm bg-[var(--background)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none transition focus:ring-2 focus:ring-[var(--ring)] ${
              emailError
                ? 'border-red-500 focus:ring-red-400'
                : 'border-[var(--input)] focus:border-[var(--ring)]'
            }`}
          />
          {emailError && (
            <p
              id="email-error"
              role="alert"
              className="mt-1.5 text-xs text-red-600 dark:text-red-400"
            >
              {emailError}
            </p>
          )}
        </div>

        {/* Password field */}
        <div className="mb-6">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-[var(--foreground)] mb-1.5"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-required="true"
            aria-invalid={passwordError ? 'true' : 'false'}
            aria-describedby={passwordError ? 'password-error' : undefined}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordError) setPasswordError('');
            }}
            placeholder="••••••••"
            className={`w-full rounded-md border px-3 py-2 text-sm bg-[var(--background)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none transition focus:ring-2 focus:ring-[var(--ring)] ${
              passwordError
                ? 'border-red-500 focus:ring-red-400'
                : 'border-[var(--input)] focus:border-[var(--ring)]'
            }`}
          />
          {passwordError && (
            <p
              id="password-error"
              role="alert"
              className="mt-1.5 text-xs text-red-600 dark:text-red-400"
            >
              {passwordError}
            </p>
          )}
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading}
          aria-busy={isLoading}
          className="w-full rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-medium py-2.5 px-4 transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      {/* Register link */}
      <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
        Don&apos;t have an account?{' '}
        <Link
          href="/register"
          className="font-medium text-[var(--foreground)] underline underline-offset-4 hover:opacity-75"
        >
          Register
        </Link>
      </p>
    </>
  );
}
