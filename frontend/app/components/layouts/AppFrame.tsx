'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { hasCloudSession } from '@/lib/storage/project-storage';
import { Logo } from '@/components/ui/logo';

interface AppFrameProps {
  children: React.ReactNode;
}

const NAV_LINKS = [
  { href: '/projects', label: 'Projects' },
  { href: '/textures', label: 'Textures' },
  { href: '/login', label: 'Sign In' },
];

export default function AppFrame({ children }: AppFrameProps) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const isEditorRoute = Boolean(pathname?.match(/^\/projects\/[^/]+$/));
  const isHomePage = pathname === '/';

  useEffect(() => {
    let mounted = true;

    const resolveSession = async () => {
      const cloudSession = await hasCloudSession();
      if (mounted) {
        setIsAuthenticated(cloudSession);
      }
    };

    resolveSession();
    return () => {
      mounted = false;
    };
  }, [pathname]);

  if (isEditorRoute || isHomePage) {
    return <>{children}</>;
  }

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
          </nav>
        </div>
      </motion.header>

      <main className="relative z-10">{children}</main>
    </div>
  );
}