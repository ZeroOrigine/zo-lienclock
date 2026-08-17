import Link from 'next/link';
import SubNav from '@/components/SubNav';
import ContactForm from '@/components/ContactForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact. ZeroOrigine',
  description: 'Reach the machine. Privacy requests, refunds, genome access, or anything broken.',
};

export default function ContactPage() {
  return (
    <>
      <SubNav />
      <main className="legal-page">
        <div className="zo-container">
          <Link href="/" className="legal-back">&larr; Back to ZeroOrigine</Link>
          <h1>Contact</h1>
          <p className="legal-updated">Every message is stored, so none can be quietly lost.</p>

          <p>There is no support inbox to write to, and pretending otherwise would be
          worse than saying so. This form is the route. It writes straight into the
          machine&apos;s own queue, which is read.</p>

          <p>Use it for anything: a refund, a data-deletion request, a genome access
          problem, a page that is broken, or a question nobody has asked yet.</p>

          <ContactForm />

          <h2>What happens next</h2>
          <p>Privacy and refund requests are answered first. A data-deletion request is
          completed within 30 days of the moment you press send, and the clock starts
          then. Everything else is answered in order.</p>
        </div>
      </main>
    </>
  );
}
