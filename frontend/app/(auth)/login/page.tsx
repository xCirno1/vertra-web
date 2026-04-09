'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Loader2, Lock, LogIn, Mail, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Divider } from '@/components/ui/divider';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/ui/logo';
import { setAuthToken } from '@/lib/storage/project-storage';

const API_BASE = 'http://localhost:8080';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const body =
        mode === 'login'
          ? { email, password }
          : { email, password, name: name.trim() || undefined };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(
          data.error ??
          (mode === 'login'
            ? 'Login failed. Please check your credentials.'
            : 'Registration failed. Please try again.'),
        );
        return;
      }

      const data = (await res.json()) as { token: string };
      setAuthToken(data.token);
      router.push('/projects');
    } catch {
      setError('Unable to reach the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLogin = mode === 'login';

  return (
    <div className="relative flex w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-vertra-surface/80 shadow-2xl shadow-black/60 backdrop-blur-xl">
      {/* Outer glow */}
      <div className="pointer-events-none absolute -inset-px rounded-2xl bg-linear-to-br from-vertra-cyan/5 to-vertra-teal/5" />

      {/* ── Brand panel ── */}
      <div className="relative hidden w-72 shrink-0 overflow-hidden bg-linear-to-br from-vertra-surface-alt to-vertra-bg p-8 lg:flex lg:flex-col">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.2]"
          style={{
            backgroundImage: 'radial-gradient(circle, #2a2a3e 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-vertra-cyan/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-12 top-1/3 h-48 w-48 rounded-full bg-vertra-teal/8 blur-3xl" />
        <div className="relative">
          <Logo />
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="relative mt-auto"
          >
            {isLogin ? (
              <>
                <p className="text-xl font-semibold leading-snug text-vertra-text">
                  Your creative workflow,{' '}
                  <span className="bg-linear-to-r from-vertra-cyan to-vertra-teal bg-clip-text text-transparent">
                    elevated.
                  </span>
                </p>
                <p className="mt-3 text-xs leading-relaxed text-vertra-text-dim">
                  Sign in to sync projects across devices, collaborate, and access cloud rendering.
                </p>
              </>
            ) : (
              <>
                <p className="text-xl font-semibold leading-snug text-vertra-text">
                  Start building{' '}
                  <span className="bg-linear-to-r from-vertra-cyan to-vertra-teal bg-clip-text text-transparent">
                    something great.
                  </span>
                </p>
                <p className="mt-3 text-xs leading-relaxed text-vertra-text-dim">
                  Create a free account to save projects to the cloud and pick up where you left off on any device.
                </p>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Form panel ── */}
      <div className="flex flex-1 flex-col justify-center p-8">
        {/* Mode toggle */}
        <div className="mb-7 flex rounded-lg border border-vertra-border bg-vertra-surface-alt p-1">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${mode === m
                ? 'bg-vertra-surface text-vertra-text shadow-sm'
                : 'text-vertra-text-dim hover:text-vertra-text'
                }`}
            >
              {m === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-vertra-text">
                {isLogin ? 'Welcome back' : 'Create account'}
              </h1>
              <p className="mt-1 text-sm text-vertra-text-dim">
                {isLogin
                  ? 'Sign in to access your projects.'
                  : 'Fill in the details below to get started.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-vertra-text-dim">
                    Display name <span className="text-vertra-text-dim/50">(optional)</span>
                  </label>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                  />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-vertra-text-dim">
                  Email address
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@studio.com"
                  required
                  autoComplete={isLogin ? 'email' : 'username'}
                  leadingIcon={<Mail className="h-4 w-4" />}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-vertra-text-dim">
                  Password
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  leadingIcon={<Lock className="h-4 w-4" />}
                />
              </div>

              {!isLogin && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-vertra-text-dim">
                    Confirm password
                  </label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                    leadingIcon={<Lock className="h-4 w-4" />}
                  />
                </div>
              )}

              {error && (
                <p className="rounded-md border border-vertra-error/20 bg-vertra-error/10 px-3 py-2 text-xs text-vertra-error">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isLogin ? 'Signing in…' : 'Creating account…'}
                  </>
                ) : isLogin ? (
                  <>
                    <LogIn className="h-4 w-4" />
                    Continue to Studio
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Create Account
                  </>
                )}
              </Button>
            </form>

            <Divider label="or" className="my-5" />

            <Button
              variant="secondary"
              size="md"
              className="w-full"
              onClick={() => router.push('/projects')}
            >
              Continue as Guest
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>

            <p className="mt-5 text-center text-xs text-vertra-text-dim">
              {isLogin ? (
                <>
                  No account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className="text-vertra-cyan hover:underline"
                  >
                    Sign up for free
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-vertra-cyan hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
