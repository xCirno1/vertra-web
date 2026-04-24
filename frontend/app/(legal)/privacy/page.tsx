import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — Vertra',
  description:
    'Learn how Vertra collects, uses, and protects your personal information when you use our web game engine platform.',
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-vertra-text">Privacy Policy</h1>
        <p className="mt-2 font-mono text-sm text-vertra-text-dim">Last updated: April 24, 2026</p>
      </div>

      <div className="space-y-6">

        <section className="rounded-xl border border-vertra-border bg-vertra-surface p-6">
          <h2 className="mb-3 text-lg font-semibold text-vertra-cyan">1. Introduction</h2>
          <p className="leading-relaxed text-vertra-text-dim">
            Vertra ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains
            how we collect, use, disclose, and safeguard your personal information when you access or use the
            Vertra platform, including our web-based game engine, 3D scene editor, batch renderer, and all
            associated services (collectively, the "Services").
          </p>
          <p className="mt-3 leading-relaxed text-vertra-text-dim">
            Please read this policy carefully. By using the Services, you consent to the practices described
            herein. If you do not agree with this policy, please do not access or use the Services.
          </p>
        </section>

        <section className="rounded-xl border border-vertra-border bg-vertra-surface p-6">
          <h2 className="mb-3 text-lg font-semibold text-vertra-cyan">2. Information We Collect</h2>
          <p className="mb-3 leading-relaxed text-vertra-text-dim">
            We collect information in the following ways:
          </p>

          <h3 className="mb-2 font-semibold text-vertra-text">Information You Provide Directly</h3>
          <ul className="mb-5 space-y-2 text-vertra-text-dim">
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              <span>
                <strong className="text-vertra-text">Account data:</strong> Name, email address, password (stored
                as a salted hash), and any optional profile details you provide.
              </span>
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              <span>
                <strong className="text-vertra-text">Payment data:</strong> Billing address and payment method
                details (processed and stored by our third-party payment processor; we do not store raw card
                numbers).
              </span>
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              <span>
                <strong className="text-vertra-text">User content:</strong> Scenes, assets, scripts, and other
                materials you create or upload to the platform.
              </span>
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              <span>
                <strong className="text-vertra-text">Communications:</strong> Messages you send to our support
                team or via feedback forms.
              </span>
            </li>
          </ul>

          <h3 className="mb-2 font-semibold text-vertra-text">Information Collected Automatically</h3>
          <ul className="space-y-2 text-vertra-text-dim">
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              <span>
                <strong className="text-vertra-text">Usage data:</strong> Pages visited, features used, render
                jobs submitted, timestamps, and interaction events.
              </span>
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              <span>
                <strong className="text-vertra-text">Device and browser data:</strong> IP address, browser type
                and version, operating system, screen resolution, and hardware information.
              </span>
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              <span>
                <strong className="text-vertra-text">Log data:</strong> Server logs including error reports, API
                request logs, and performance telemetry.
              </span>
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              <span>
                <strong className="text-vertra-text">Cookies and similar technologies:</strong> Session tokens,
                preference cookies, and analytics identifiers (see Section 6).
              </span>
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-vertra-border bg-vertra-surface p-6">
          <h2 className="mb-3 text-lg font-semibold text-vertra-cyan">3. How We Use Your Information</h2>
          <p className="mb-3 leading-relaxed text-vertra-text-dim">
            We use the information we collect for the following purposes:
          </p>
          <ul className="space-y-2 text-vertra-text-dim">
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              To provide, operate, maintain, and improve the Services.
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              To authenticate users and protect account security.
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              To process transactions and manage your subscription or account plan.
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              To send transactional communications such as account confirmations, invoices, and service alerts.
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              To send product updates, newsletters, and marketing communications where you have opted in.
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              To analyze usage patterns and diagnose technical problems.
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              To personalize your experience and remember your preferences.
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              To comply with legal obligations and enforce our Terms of Service.
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-vertra-border bg-vertra-surface p-6">
          <h2 className="mb-3 text-lg font-semibold text-vertra-cyan">4. Information Sharing and Disclosure</h2>
          <p className="mb-3 leading-relaxed text-vertra-text-dim">
            We do not sell, rent, or trade your personal information. We may share your information only in the
            following circumstances:
          </p>
          <ul className="space-y-2 text-vertra-text-dim">
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              <span>
                <strong className="text-vertra-text">Service providers:</strong> Trusted third-party vendors who
                assist us in operating the platform (e.g., cloud hosting, payment processing, analytics, email
                delivery). These parties are contractually bound to use your data only as needed to provide their
                services to us.
              </span>
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              <span>
                <strong className="text-vertra-text">Legal requirements:</strong> When required by law, court
                order, or governmental authority, or when we believe disclosure is necessary to protect our
                rights, your safety, or the safety of others.
              </span>
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              <span>
                <strong className="text-vertra-text">Business transfers:</strong> In connection with a merger,
                acquisition, or sale of all or substantially all of our assets, your information may be
                transferred as part of that transaction, subject to equivalent privacy protections.
              </span>
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              <span>
                <strong className="text-vertra-text">With your consent:</strong> In any other case where you
                have explicitly authorized the disclosure.
              </span>
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-vertra-border bg-vertra-surface p-6">
          <h2 className="mb-3 text-lg font-semibold text-vertra-cyan">5. Data Security</h2>
          <p className="leading-relaxed text-vertra-text-dim">
            We take reasonable administrative, technical, and physical security measures to protect your personal
            information from unauthorized access, disclosure, alteration, or destruction. These measures include:
          </p>
          <ul className="mt-3 space-y-2 text-vertra-text-dim">
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              Encryption of data in transit using TLS 1.2 or higher.
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              Encryption of sensitive data at rest.
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              Regular security audits and vulnerability assessments.
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              Access controls limiting data access to authorized personnel on a need-to-know basis.
            </li>
          </ul>
          <p className="mt-3 leading-relaxed text-vertra-text-dim">
            However, no method of electronic transmission or storage is 100% secure. While we strive to protect
            your information, we cannot guarantee absolute security. In the event of a data breach that affects
            your rights, we will notify you as required by applicable law.
          </p>
        </section>

        <section className="rounded-xl border border-vertra-border bg-vertra-surface p-6">
          <h2 className="mb-3 text-lg font-semibold text-vertra-cyan">6. Cookies and Tracking Technologies</h2>
          <p className="leading-relaxed text-vertra-text-dim">
            We use cookies and similar tracking technologies to enhance your experience on the Services. Types of
            cookies we use include:
          </p>
          <ul className="mt-3 space-y-2 text-vertra-text-dim">
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              <span>
                <strong className="text-vertra-text">Essential cookies:</strong> Required for core functionality
                such as authentication, session management, and security.
              </span>
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              <span>
                <strong className="text-vertra-text">Preference cookies:</strong> Remember your settings and
                customizations across sessions.
              </span>
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              <span>
                <strong className="text-vertra-text">Analytics cookies:</strong> Help us understand how users
                interact with the Services so we can improve them.
              </span>
            </li>
          </ul>
          <p className="mt-3 leading-relaxed text-vertra-text-dim">
            You can control cookies through your browser settings. Disabling essential cookies may prevent
            certain features from functioning correctly. We do not use third-party advertising cookies.
          </p>
        </section>

        <section className="rounded-xl border border-vertra-border bg-vertra-surface p-6">
          <h2 className="mb-3 text-lg font-semibold text-vertra-cyan">7. Your Rights and Choices</h2>
          <p className="mb-3 leading-relaxed text-vertra-text-dim">
            Depending on your jurisdiction, you may have the following rights with respect to your personal data:
          </p>
          <ul className="space-y-2 text-vertra-text-dim">
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              <span>
                <strong className="text-vertra-text">Access:</strong> Request a copy of the personal data we
                hold about you.
              </span>
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              <span>
                <strong className="text-vertra-text">Correction:</strong> Request correction of inaccurate or
                incomplete personal data.
              </span>
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              <span>
                <strong className="text-vertra-text">Deletion:</strong> Request deletion of your personal data,
                subject to our legal retention obligations.
              </span>
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              <span>
                <strong className="text-vertra-text">Portability:</strong> Request a machine-readable export of
                your personal data.
              </span>
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              <span>
                <strong className="text-vertra-text">Opt-out:</strong> Unsubscribe from marketing emails at any
                time using the link in any such email.
              </span>
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              <span>
                <strong className="text-vertra-text">Objection / Restriction:</strong> Object to or request
                restriction of certain processing activities.
              </span>
            </li>
          </ul>
          <p className="mt-3 leading-relaxed text-vertra-text-dim">
            To exercise any of these rights, please contact us at{' '}
            <a href="mailto:privacy@vertra.io" className="text-vertra-cyan hover:underline">
              privacy@vertra.io
            </a>
            . We will respond within the timeframe required by applicable law.
          </p>
        </section>

        <section className="rounded-xl border border-vertra-border bg-vertra-surface p-6">
          <h2 className="mb-3 text-lg font-semibold text-vertra-cyan">8. Children&apos;s Privacy</h2>
          <p className="leading-relaxed text-vertra-text-dim">
            The Services are not directed to children under the age of 13. We do not knowingly collect personal
            information from children under 13. If you are a parent or guardian and believe your child has
            provided us with personal information without your consent, please contact us at{' '}
            <a href="mailto:privacy@vertra.io" className="text-vertra-cyan hover:underline">
              privacy@vertra.io
            </a>{' '}
            and we will take steps to delete such information promptly.
          </p>
        </section>

        <section className="rounded-xl border border-vertra-border bg-vertra-surface p-6">
          <h2 className="mb-3 text-lg font-semibold text-vertra-cyan">9. Changes to This Privacy Policy</h2>
          <p className="leading-relaxed text-vertra-text-dim">
            We may update this Privacy Policy periodically to reflect changes in our practices, legal
            requirements, or the Services themselves. When we make material changes, we will update the date at
            the top of this page and, where appropriate, notify you via the email address associated with your
            account.
          </p>
          <p className="mt-3 leading-relaxed text-vertra-text-dim">
            We encourage you to review this policy regularly. Your continued use of the Services following any
            changes constitutes your acceptance of the revised policy.
          </p>
        </section>

        <section className="rounded-xl border border-vertra-border bg-vertra-surface p-6">
          <h2 className="mb-3 text-lg font-semibold text-vertra-cyan">10. Contact Us</h2>
          <p className="leading-relaxed text-vertra-text-dim">
            If you have questions, concerns, or requests regarding this Privacy Policy or our data practices,
            please contact us:
          </p>
          <div className="mt-4 rounded-lg border border-vertra-border bg-vertra-surface-alt p-4 font-mono text-sm text-vertra-text-dim">
            <p>Vertra — Privacy Team</p>
            <p className="mt-1">
              Email:{' '}
              <a href="mailto:privacy@vertra.io" className="text-vertra-cyan hover:underline">
                privacy@vertra.io
              </a>
            </p>
            <p className="mt-1">
              General support:{' '}
              <a href="mailto:support@vertra.io" className="text-vertra-cyan hover:underline">
                support@vertra.io
              </a>
            </p>
          </div>
        </section>

        {/* Footer cross-link */}
        <div className="rounded-xl border border-vertra-border bg-vertra-surface-alt p-5">
          <p className="text-sm text-vertra-text-dim">
            Also see our{' '}
            <Link href="/terms" className="text-vertra-cyan hover:underline">
              Terms of Service
            </Link>
            , which governs your use of the Vertra platform and Services.
          </p>
        </div>

      </div>
    </div>
  );
}
