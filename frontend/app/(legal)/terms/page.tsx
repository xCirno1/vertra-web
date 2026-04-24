import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service — Vertra',
  description:
    'Read the Vertra Terms of Service to understand the rules and guidelines governing your use of our web game engine platform.',
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-vertra-text">Terms of Service</h1>
        <p className="mt-2 font-mono text-sm text-vertra-text-dim">Last updated: April 24, 2026</p>
      </div>

      <div className="space-y-6">

        <section className="rounded-xl border border-vertra-border bg-vertra-surface p-6">
          <h2 className="mb-3 text-lg font-semibold text-vertra-cyan">1. Introduction</h2>
          <p className="leading-relaxed text-vertra-text-dim">
            Welcome to Vertra. These Terms of Service ("Terms") govern your access to and use of the Vertra
            platform, including our web-based game engine, 3D batch renderer, scene editor, APIs, and all related
            services (collectively, the "Services") provided by Vertra ("we," "us," or "our"). By accessing or
            using our Services, you agree to be bound by these Terms. If you do not agree to these Terms, you may
            not access or use the Services.
          </p>
        </section>

        <section className="rounded-xl border border-vertra-border bg-vertra-surface p-6">
          <h2 className="mb-3 text-lg font-semibold text-vertra-cyan">2. Acceptance of Terms</h2>
          <p className="leading-relaxed text-vertra-text-dim">
            By creating an account, accessing the platform, or using any part of the Services, you represent that:
          </p>
          <ul className="mt-3 space-y-2 text-vertra-text-dim">
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              You are at least 13 years of age (or the minimum age required by law in your jurisdiction).
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              You have the legal capacity to enter into a binding agreement.
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              If you are accepting these Terms on behalf of an organization, you have the authority to bind that
              organization to these Terms.
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-vertra-border bg-vertra-surface p-6">
          <h2 className="mb-3 text-lg font-semibold text-vertra-cyan">3. Description of Services</h2>
          <p className="leading-relaxed text-vertra-text-dim">
            Vertra provides a browser-based game engine and 3D scene creation platform designed for developers,
            designers, and creators. Our Services include, but are not limited to:
          </p>
          <ul className="mt-3 space-y-2 text-vertra-text-dim">
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              A real-time 3D scene editor accessible via web browser.
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              A batch rendering pipeline for high-fidelity offline renders.
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              Project management and asset storage capabilities.
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              Collaboration features and export tools.
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              APIs and integrations for workflow automation.
            </li>
          </ul>
          <p className="mt-3 leading-relaxed text-vertra-text-dim">
            We reserve the right to modify, suspend, or discontinue any aspect of the Services at any time with
            reasonable notice where practicable.
          </p>
        </section>

        <section className="rounded-xl border border-vertra-border bg-vertra-surface p-6">
          <h2 className="mb-3 text-lg font-semibold text-vertra-cyan">4. User Accounts</h2>
          <p className="leading-relaxed text-vertra-text-dim">
            To access most features of the Services, you must create an account. You agree to:
          </p>
          <ul className="mt-3 space-y-2 text-vertra-text-dim">
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              Provide accurate, current, and complete registration information.
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              Maintain and promptly update your account information to keep it accurate and complete.
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              Maintain the security of your password and accept responsibility for all activity under your account.
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              Notify us immediately at{' '}
              <a href="mailto:support@vertra.io" className="text-vertra-cyan hover:underline">
                support@vertra.io
              </a>{' '}
              of any unauthorized use of your account.
            </li>
          </ul>
          <p className="mt-3 leading-relaxed text-vertra-text-dim">
            We reserve the right to suspend or terminate accounts that violate these Terms or that have been
            inactive for an extended period, with prior notice where feasible.
          </p>
        </section>

        <section className="rounded-xl border border-vertra-border bg-vertra-surface p-6">
          <h2 className="mb-3 text-lg font-semibold text-vertra-cyan">5. Intellectual Property</h2>
          <p className="leading-relaxed text-vertra-text-dim">
            The Vertra platform, including its underlying engine, renderer, editor interface, proprietary
            algorithms, source code, visual design, trademarks, and documentation ("Vertra IP"), is owned
            exclusively by Vertra and protected by intellectual property laws. You are granted a limited,
            non-exclusive, non-transferable, revocable license to use the Services solely as permitted by these
            Terms.
          </p>
          <p className="mt-3 leading-relaxed text-vertra-text-dim">
            You retain full ownership of any original content, scenes, assets, scripts, or other creative work
            you create using the Services ("User Content"). You grant Vertra a limited license to host, store,
            and process your User Content solely to provide the Services to you.
          </p>
          <p className="mt-3 leading-relaxed text-vertra-text-dim">
            You may not reverse-engineer, decompile, disassemble, or otherwise attempt to derive the source code
            of any portion of the Services not made available as open source.
          </p>
        </section>

        <section className="rounded-xl border border-vertra-border bg-vertra-surface p-6">
          <h2 className="mb-3 text-lg font-semibold text-vertra-cyan">6. User Content</h2>
          <p className="leading-relaxed text-vertra-text-dim">
            You are solely responsible for all content you upload, create, share, or otherwise make available
            through the Services. By submitting User Content, you represent and warrant that:
          </p>
          <ul className="mt-3 space-y-2 text-vertra-text-dim">
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              You own or have obtained all necessary rights and permissions to use and share the content.
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              The content does not infringe any third-party intellectual property, privacy, or other rights.
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              The content complies with all applicable laws and regulations.
            </li>
          </ul>
          <p className="mt-3 leading-relaxed text-vertra-text-dim">
            We reserve the right to remove any User Content that we determine, in our sole discretion, violates
            these Terms or is otherwise objectionable, without prior notice.
          </p>
        </section>

        <section className="rounded-xl border border-vertra-border bg-vertra-surface p-6">
          <h2 className="mb-3 text-lg font-semibold text-vertra-cyan">7. Prohibited Uses</h2>
          <p className="mb-3 leading-relaxed text-vertra-text-dim">You agree not to use the Services to:</p>
          <ul className="space-y-2 text-vertra-text-dim">
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              Violate any applicable local, national, or international law or regulation.
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              Attempt to gain unauthorized access to any part of the Services, servers, or networks.
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              Transmit any malware, viruses, or other malicious code.
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              Conduct denial-of-service attacks or interfere with the Services' normal operation.
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              Harvest or collect personal information from other users without their consent.
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              Use automated scripts to scrape, crawl, or extract data from the Services without written
              permission.
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              Impersonate any person, entity, or Vertra employee.
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              Use the Services to create, render, or distribute content that is illegal, harmful, or violates
              the rights of others.
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-vertra-border bg-vertra-surface p-6">
          <h2 className="mb-3 text-lg font-semibold text-vertra-cyan">8. Termination</h2>
          <p className="leading-relaxed text-vertra-text-dim">
            You may terminate your account at any time by contacting us at{' '}
            <a href="mailto:support@vertra.io" className="text-vertra-cyan hover:underline">
              support@vertra.io
            </a>{' '}
            or through your account settings. We reserve the right to suspend or terminate your access to the
            Services at our sole discretion, with or without notice, for conduct that we believe violates these
            Terms or is harmful to other users, us, third parties, or the integrity of the Services.
          </p>
          <p className="mt-3 leading-relaxed text-vertra-text-dim">
            Upon termination, your right to use the Services ceases immediately. Provisions of these Terms that
            by their nature should survive termination will remain in effect, including intellectual property
            provisions, disclaimers, limitations of liability, and governing law.
          </p>
        </section>

        <section className="rounded-xl border border-vertra-border bg-vertra-surface p-6">
          <h2 className="mb-3 text-lg font-semibold text-vertra-cyan">9. Disclaimers</h2>
          <p className="leading-relaxed text-vertra-text-dim">
            THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS
            OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
            PURPOSE, TITLE, NON-INFRINGEMENT, AND FREEDOM FROM COMPUTER VIRUSES. Vertra does not warrant that
            the Services will be uninterrupted, error-free, or completely secure.
          </p>
          <p className="mt-3 leading-relaxed text-vertra-text-dim">
            We do not warrant the accuracy, reliability, or completeness of any content available through the
            Services, including User Content. You use the Services at your own risk.
          </p>
        </section>

        <section className="rounded-xl border border-vertra-border bg-vertra-surface p-6">
          <h2 className="mb-3 text-lg font-semibold text-vertra-cyan">10. Limitation of Liability</h2>
          <p className="leading-relaxed text-vertra-text-dim">
            TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, VERTRA AND ITS DIRECTORS, EMPLOYEES, PARTNERS,
            AGENTS, SUPPLIERS, OR AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
            CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE,
            GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:
          </p>
          <ul className="mt-3 space-y-2 text-vertra-text-dim">
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              Your access to or use of (or inability to access or use) the Services.
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              Any conduct or content of any third party on the Services.
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1 shrink-0 font-mono text-vertra-cyan">—</span>
              Unauthorized access, use, or alteration of your transmissions or content.
            </li>
          </ul>
          <p className="mt-3 leading-relaxed text-vertra-text-dim">
            In no event shall Vertra&apos;s aggregate liability exceed the greater of (a) the amounts you have
            paid to Vertra in the twelve months prior to the claim, or (b) one hundred US dollars (USD $100).
          </p>
        </section>

        <section className="rounded-xl border border-vertra-border bg-vertra-surface p-6">
          <h2 className="mb-3 text-lg font-semibold text-vertra-cyan">11. Governing Law</h2>
          <p className="leading-relaxed text-vertra-text-dim">
            These Terms shall be governed by and construed in accordance with the laws of the State of Delaware,
            United States, without regard to its conflict of law provisions. Any legal action or proceeding
            arising under these Terms shall be brought exclusively in the federal or state courts located in
            Delaware, and you hereby consent to personal jurisdiction and venue in such courts.
          </p>
        </section>

        <section className="rounded-xl border border-vertra-border bg-vertra-surface p-6">
          <h2 className="mb-3 text-lg font-semibold text-vertra-cyan">12. Changes to These Terms</h2>
          <p className="leading-relaxed text-vertra-text-dim">
            We may revise these Terms from time to time. When we make material changes, we will notify you by
            updating the date at the top of this page and, where appropriate, by sending a notification to the
            email address associated with your account. Your continued use of the Services after any such change
            constitutes your acceptance of the new Terms.
          </p>
          <p className="mt-3 leading-relaxed text-vertra-text-dim">
            We encourage you to review these Terms periodically to stay informed about your rights and
            obligations.
          </p>
        </section>

        <section className="rounded-xl border border-vertra-border bg-vertra-surface p-6">
          <h2 className="mb-3 text-lg font-semibold text-vertra-cyan">13. Contact Us</h2>
          <p className="leading-relaxed text-vertra-text-dim">
            If you have any questions about these Terms of Service, please contact us:
          </p>
          <div className="mt-4 rounded-lg border border-vertra-border bg-vertra-surface-alt p-4 font-mono text-sm text-vertra-text-dim">
            <p>Vertra</p>
            <p className="mt-1">
              Email:{' '}
              <a href="mailto:legal@vertra.io" className="text-vertra-cyan hover:underline">
                legal@vertra.io
              </a>
            </p>
            <p className="mt-1">
              Support:{' '}
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
            <Link href="/privacy" className="text-vertra-cyan hover:underline">
              Privacy Policy
            </Link>
            , which describes how we collect, use, and protect your personal information.
          </p>
        </div>

      </div>
    </div>
  );
}
