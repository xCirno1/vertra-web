'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { Logo } from '@/components/ui/logo';

interface AppFrameProps {
  children: React.ReactNode;
}

interface MeUser {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
}

const NAV_LINKS = [
  { href: '/projects', label: 'Projects' },
  { href: '/textures', label: 'Textures' },
];

function getInitials(name?: string | null, email?: string): string {
  if (name) {
    return name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return (email?.[0] ?? 'U').toUpperCase();
}

function isAuthed(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some((c) => c.trim() === 'vertra-authed=1');
}

export default function AppFrame({ children }: AppFrameProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isEditorRoute = Boolean(pathname?.match(/^\/projects\/[^/]+$/));
  const isHomePage = pathname === '/';
  const isPublicViewerRoute = Boolean(pathname?.match(/^\/s\/[^/]+$/));

  const [user, setUser] = useState<MeUser | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch /api/auth/me when a session cookie is present
  useEffect(() => {
    if (!isAuthed()) return;
    fetch('/api/auth/me')
      .then(async (res) => {
        if (!res.ok) return null;
        const data = (await res.json()) as { user: MeUser } | MeUser;
        // Handle both { user: {...} } and flat {...} shapes
        return 'user' in data ? data.user : data;
      })
      .then((data) => setUser(data))
      .catch(() => null);
  }, [pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
  };

  if (isEditorRoute || isHomePage || isPublicViewerRoute) {
    return <>{children}</>;
  }

  const initials = getInitials(user?.name, user?.email);

  return (
    <div className="relative min-h-screen bg-vertra-bg">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(29,212,246,0.10),transparent_45%),radial-gradient(circle_at_85%_85%,rgba(142,207,190,0.08),transparent_50%)]" />

      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-30 border-b border-vertra-border/60 bg-vertra-bg/80 backdrop-blur"
      >
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <Logo asLink />

          {/* Nav */}
          <nav className="flex items-center gap-1 text-sm">
            {NAV_LINKS.map(({ href, label }) => {
              const isActive =
                pathname === href ||
                (href !== '/' && pathname?.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`rounded-md px-3 py-1.5 transition-colors ${isActive
                      ? 'bg-vertra-surface text-vertra-text'
                      : 'text-vertra-text-dim hover:bg-vertra-surface/60 hover:text-vertra-text'
                    }`}
                >
                  {label}
                </Link>
              );
            })}

            {/* Auth section */}
            {user ? (
              // ── Avatar dropdown ────────────────────────────────────────────
              <div ref={dropdownRef} className="relative ml-1">
                <button
                  type="button"
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-vertra-surface"
                  aria-haspopup="true"
                  aria-expanded={dropdownOpen}
                >
                  {/* Avatar */}
                  <div className="h-7 w-7 overflow-hidden rounded-full border border-vertra-border bg-vertra-surface-alt">
                    {user.avatar ? (
                      <Image
                        src={user.avatar}
                        alt="Profile"
                        width={28}
                        height={28}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-vertra-text">
                        {initials}
                      </div>
                    )}
                  </div>
                  <span className="hidden max-w-25 truncate text-sm text-vertra-text sm:block">
                    {user.name ?? user.email.split('@')[0]}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-vertra-text-dim transition-transform ${dropdownOpen ? 'rotate-180' : ''
                      }`}
                  />
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.96 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 mt-1.5 w-48 overflow-hidden rounded-xl border border-vertra-border bg-vertra-surface shadow-lg shadow-black/30"
                    >
                      {/* User info */}
                      <div className="border-b border-vertra-border/60 px-3.5 py-3">
                        <p className="text-sm font-medium text-vertra-text truncate">
                          {user.name ?? user.email.split('@')[0]}
                        </p>
                        <p className="text-xs text-vertra-text-dim truncate">{user.email}</p>
                      </div>

                      {/* Menu items */}
                      <div className="py-1">
                        <Link
                          href="/profile"
                          onClick={() => setDropdownOpen(false)}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-vertra-text-dim transition-colors hover:bg-vertra-surface-alt hover:text-vertra-text"
                        >
                          <User className="h-4 w-4" />
                          Profile
                        </Link>
                        <Link
                          href="/profile"
                          onClick={() => setDropdownOpen(false)}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-vertra-text-dim transition-colors hover:bg-vertra-surface-alt hover:text-vertra-text"
                        >
                          <Settings className="h-4 w-4" />
                          Settings
                        </Link>
                      </div>

                      <div className="border-t border-vertra-border/60 py-1">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-vertra-error/80 transition-colors hover:bg-vertra-error/10 hover:text-vertra-error"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              // ── Sign in link ───────────────────────────────────────────────
              <Link
                href="/login"
                className={`rounded-md px-3 py-1.5 transition-colors ${pathname === '/login'
                    ? 'bg-vertra-surface text-vertra-text'
                    : 'text-vertra-text-dim hover:bg-vertra-surface/60 hover:text-vertra-text'
                  }`}
              >
                Sign In
              </Link>
            )}
          </nav>
        </div>
      </motion.header>

      <main className="relative z-10">{children}</main>
    </div>
  );
}