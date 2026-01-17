import Link from 'next/link';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

export default function PrivacyPage() {
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

          <h1 className="text-3xl font-normal text-void-white mb-8">Privacy Policy</h1>

          <div className="space-y-6 text-void-text text-base leading-relaxed">
            <p className="text-void-muted">Last updated: November 2025</p>

            <section>
              <h2 className="text-xl text-void-white mb-3">1. Introduction</h2>
              <p>
                VoidDex is committed to protecting your privacy. This Privacy Policy explains how we
                collect, use, and safeguard information when you use our decentralized application
                interface. As a privacy-focused platform, we minimize data collection by design.
              </p>
            </section>

            <section>
              <h2 className="text-xl text-void-white mb-3">2. Information We Do NOT Collect</h2>
              <p>VoidDex is a non-custodial interface. We do not:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-void-muted">
                <li>Store your private keys or seed phrases</li>
                <li>Have access to your wallet funds</li>
                <li>Track your transaction history on our servers</li>
                <li>Require account registration or personal information</li>
                <li>Store your IP address in association with wallet addresses</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl text-void-white mb-3">
                3. Information Collected Automatically
              </h2>
              <p>When you use VoidDex, the following may be collected automatically:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-void-muted">
                <li>Browser type and version</li>
                <li>Device type and operating system</li>
                <li>Referral source</li>
                <li>Anonymous usage statistics</li>
              </ul>
              <p className="mt-2">
                This data is collected in aggregate form and cannot be used to identify individual
                users.
              </p>
            </section>

            <section>
              <h2 className="text-xl text-void-white mb-3">4. Blockchain Data</h2>
              <p>
                All transactions executed through VoidDex occur on public blockchain networks. While
                we do not store this data, blockchain transactions are publicly visible and
                permanently recorded. The privacy protocols integrated into VoidDex (Railgun,
                Privacy Pools, Aztec) are designed to enhance transaction privacy, but we cannot
                guarantee absolute anonymity.
              </p>
            </section>

            <section>
              <h2 className="text-xl text-void-white mb-3">5. Third-Party Services</h2>
              <p>VoidDex integrates with third-party services and protocols:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-void-muted">
                <li>
                  <strong>Wallet Providers:</strong> WalletConnect, MetaMask, and other wallet
                  services have their own privacy policies
                </li>
                <li>
                  <strong>Privacy Protocols:</strong> Railgun, Privacy Pools, and Aztec operate
                  independently with their own data practices
                </li>
                <li>
                  <strong>RPC Providers:</strong> Blockchain data is fetched through third-party RPC
                  endpoints
                </li>
                <li>
                  <strong>Analytics:</strong> We may use privacy-respecting analytics tools
                </li>
              </ul>
              <p className="mt-2">
                We encourage you to review the privacy policies of these third-party services.
              </p>
            </section>

            <section>
              <h2 className="text-xl text-void-white mb-3">6. Cookies and Local Storage</h2>
              <p>VoidDex uses browser local storage to remember your preferences such as:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-void-muted">
                <li>Cookie consent status</li>
                <li>Selected network preferences</li>
                <li>UI settings</li>
              </ul>
              <p className="mt-2">
                See our{' '}
                <Link href="/cookies" className="text-void-accent hover:underline">
                  Cookie Policy
                </Link>{' '}
                for more details.
              </p>
            </section>

            <section>
              <h2 className="text-xl text-void-white mb-3">7. Data Security</h2>
              <p>
                Since VoidDex is a client-side application that does not store user data on
                centralized servers, your data security primarily depends on your own device
                security, wallet security, and the security of the blockchain networks you interact
                with.
              </p>
            </section>

            <section>
              <h2 className="text-xl text-void-white mb-3">8. Your Rights</h2>
              <p>
                Since we do not collect personal data, traditional data subject rights (access,
                deletion, etc.) are not applicable. You can clear local storage through your browser
                settings at any time.
              </p>
            </section>

            <section>
              <h2 className="text-xl text-void-white mb-3">9. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify users of any
                material changes by updating the &quot;Last updated&quot; date.
              </p>
            </section>

            <section>
              <h2 className="text-xl text-void-white mb-3">10. Contact</h2>
              <p>For privacy-related inquiries, please contact us through our official channels.</p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
