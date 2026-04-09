'use client';

import { Boxes } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  /** Wraps the logo in a Next.js Link pointing to "/" */
  asLink?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export function Logo({ asLink = false, className, size = 'sm' }: LogoProps) {
  const inner = (
    <>
      <Boxes className={cn('text-vertra-cyan', size === 'sm' ? 'h-4 w-4' : 'h-5 w-5')} />
      <span
        className={cn(
          'bg-linear-to-r from-vertra-cyan to-vertra-teal bg-clip-text font-semibold text-transparent',
          size === 'sm' ? 'text-sm' : 'text-base',
        )}
      >
        Vertra Studio
      </span>
    </>
  );

  if (asLink) {
    return (
      <Link
        href="/"
        className={cn(
          'group flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-vertra-surface/50',
          className,
        )}
      >
        {inner}
      </Link>
    );
  }

  return <div className={cn('flex items-center gap-2', className)}>{inner}</div>;
}

export type { LogoProps };
