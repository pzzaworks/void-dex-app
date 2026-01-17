import Link from 'next/link';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

export default function TermsPage() {
  return (
    <>
      <Header />
      <div className="min-h-screen py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/"
            className="inline-block mb-8 px-4 py-2 bg-void-dark hover:bg-void-light text-void-text text-base rounded-lg transition-colors"
          >
            &larr; Back to App
          </Link>

          <h1 className="text-3xl font-normal text-void-white mb-8">Terms of Service</h1>

          <div className="space-y-6 text-void-text text-base leading-relaxed">
            <p className="text-void-muted">Last updated: November 2025</p>

            <section>
              <h2 className="text-xl text-void-white mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing or using VoidDex (&quot;the Service&quot;), you agree to be bound by
                these Terms of Service. If you do not agree to these terms, do not use the Service.
                VoidDex is a decentralized application interface that aggregates privacy-focused
                protocols for cryptocurrency transactions.
              </p>
            </section>

            <section>
              <h2 className="text-xl text-void-white mb-3">2. Nature of the Service</h2>
              <p>
                VoidDex is a non-custodial interface that connects users with third-party privacy
                protocols including but not limited to Railgun, Privacy Pools, and Aztec. We do not
                hold, control, or have access to your funds at any time. All transactions are
                executed directly on blockchain networks through smart contracts developed and
                maintained by third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl text-void-white mb-3">3. No Financial Advice</h2>
              <p>
                Nothing on VoidDex constitutes financial, investment, legal, or tax advice. You are
                solely responsible for evaluating any transaction before execution. Cryptocurrency
                transactions carry inherent risks including but not limited to market volatility,
                smart contract vulnerabilities, and regulatory uncertainty.
              </p>
            </section>

            <section>
              <h2 className="text-xl text-void-white mb-3">4. Assumption of Risk</h2>
              <p>You acknowledge and agree that:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-void-muted">
                <li>Cryptocurrency transactions are irreversible</li>
                <li>Smart contracts may contain bugs or vulnerabilities</li>
                <li>Third-party protocols may fail, be exploited, or cease operations</li>
                <li>Privacy features may not provide absolute anonymity</li>
                <li>Regulatory actions may affect the availability of the Service</li>
                <li>You may lose some or all of your funds</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl text-void-white mb-3">5. Limitation of Liability</h2>
              <p className="font-medium text-void-white">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, VOIDDEX AND ITS AFFILIATES, OFFICERS,
                EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
                SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE,
                INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-void-muted">
                <li>Loss of funds due to smart contract failures</li>
                <li>Loss of funds due to user error</li>
                <li>Loss of funds due to third-party protocol failures</li>
                <li>Loss of funds due to hacks or exploits</li>
                <li>Any other financial losses whatsoever</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl text-void-white mb-3">6. Third-Party Services</h2>
              <p>
                VoidDex integrates with third-party protocols and services. We do not control,
                endorse, or assume responsibility for any third-party content, products, or
                services. Your interactions with third-party protocols are governed by their
                respective terms and conditions.
              </p>
            </section>

            <section>
              <h2 className="text-xl text-void-white mb-3">7. Prohibited Uses</h2>
              <p>
                You agree not to use VoidDex for any unlawful purposes including but not limited to
                money laundering, terrorist financing, sanctions evasion, or any other illegal
                activities. You are solely responsible for ensuring your use complies with
                applicable laws in your jurisdiction.
              </p>
            </section>

            <section>
              <h2 className="text-xl text-void-white mb-3">8. Indemnification</h2>
              <p>
                You agree to indemnify and hold harmless VoidDex and its affiliates from any claims,
                damages, losses, or expenses arising from your use of the Service or violation of
                these terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl text-void-white mb-3">9. Modifications</h2>
              <p>
                We reserve the right to modify these terms at any time. Continued use of the Service
                after modifications constitutes acceptance of the updated terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl text-void-white mb-3">10. Contact</h2>
              <p>
                For questions about these terms, please contact us through our official channels.
              </p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
