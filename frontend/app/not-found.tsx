import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4"
      style={{
        background:
          'radial-gradient(circle at 50% 40%, rgba(29,212,246,0.06) 0%, rgba(10,10,12,0) 60%), #0a0a0c',
      }}
    >
      {/* Subtle grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(42,42,62,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(42,42,62,0.35) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Ghost 404 */}
        <p
          className="font-mono font-bold leading-none text-vertra-cyan"
          style={{ fontSize: 'clamp(6rem, 20vw, 12rem)', opacity: 0.18, userSelect: 'none' }}
          aria-hidden
        >
          404
        </p>

        <div className="-mt-6 space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-vertra-text sm:text-4xl">
            Page Not Found
          </h1>
          <p className="max-w-sm text-base leading-relaxed text-vertra-text-dim">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        {/* CTA buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-vertra-cyan bg-transparent px-5 py-2.5 font-mono text-sm font-medium text-vertra-cyan transition-colors hover:bg-vertra-cyan/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-vertra-cyan"
          >
            ← Go Home
          </Link>
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 rounded-lg border border-vertra-border bg-vertra-surface px-5 py-2.5 font-mono text-sm font-medium text-vertra-text-dim transition-colors hover:border-vertra-text-dim hover:text-vertra-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-vertra-border"
          >
            View Projects
          </Link>
        </div>

        {/* Legal footer links */}
        <div className="mt-16 flex items-center gap-4 font-mono text-xs text-vertra-text-dim">
          <Link href="/terms" className="transition-colors hover:text-vertra-cyan">
            Terms of Service
          </Link>
          <span aria-hidden className="text-vertra-border">/</span>
          <Link href="/privacy" className="transition-colors hover:text-vertra-cyan">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
