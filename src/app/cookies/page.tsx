import Link from 'next/link';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

export default function CookiesPage() {
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

          <h1 className="text-3xl font-normal text-void-white mb-8">Cookie Policy</h1>

          <div className="space-y-6 text-void-text text-base leading-relaxed">
            <p className="text-void-muted">Last updated: November 2025</p>

            <section>
              <h2 className="text-xl text-void-white mb-3">1. What Are Cookies</h2>
              <p>
                Cookies are small text files stored on your device when you visit a website. They
                help websites remember your preferences and improve your experience. VoidDex uses
                minimal cookies and local storage to function properly.
              </p>
            </section>

            <section>
              <h2 className="text-xl text-void-white mb-3">2. How We Use Cookies</h2>
              <p>VoidDex uses cookies and local storage for the following purposes:</p>

              <div className="mt-4 space-y-4">
                <div className="bg-void-gray rounded-lg p-4">
                  <h3 className="text-void-white font-medium mb-2">Essential Cookies</h3>
                  <p className="text-void-muted text-sm">
                    These are necessary for the website to function and cannot be disabled.
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-void-muted">
                    <li>
                      <code className="text-void-accent">cookie-consent</code> - Remembers your
                      cookie preferences
                    </li>
                    <li>
                      <code className="text-void-accent">wagmi.store</code> - Wallet connection
                      state (WalletConnect)
                    </li>
                  </ul>
                </div>

                <div className="bg-void-gray rounded-lg p-4">
                  <h3 className="text-void-white font-medium mb-2">Functional Cookies</h3>
                  <p className="text-void-muted text-sm">
                    These enhance functionality and personalization.
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-void-muted">
                    <li>
                      <code className="text-void-accent">preferred-network</code> - Your selected
                      blockchain network
                    </li>
                    <li>
                      <code className="text-void-accent">privacy-level</code> - Your default privacy
                      settings
                    </li>
                  </ul>
                </div>

                <div className="bg-void-gray rounded-lg p-4">
                  <h3 className="text-void-white font-medium mb-2">Third-Party Cookies</h3>
                  <p className="text-void-muted text-sm">
                    Set by third-party services integrated into VoidDex.
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-void-muted">
                    <li>
                      <code className="text-void-accent">WalletConnect</code> - Wallet connection
                      service
                    </li>
                    <li>
                      <code className="text-void-accent">RainbowKit</code> - Wallet UI provider
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl text-void-white mb-3">3. Local Storage</h2>
              <p>
                In addition to cookies, VoidDex uses browser local storage to persist data locally
                on your device. This data never leaves your browser and is not transmitted to our
                servers.
              </p>
            </section>

            <section>
              <h2 className="text-xl text-void-white mb-3">4. Managing Cookies</h2>
              <p>You can manage cookies through your browser settings:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-void-muted">
                <li>
                  <strong>Chrome:</strong> Settings &gt; Privacy and Security &gt; Cookies
                </li>
                <li>
                  <strong>Firefox:</strong> Settings &gt; Privacy &amp; Security &gt; Cookies
                </li>
                <li>
                  <strong>Safari:</strong> Preferences &gt; Privacy &gt; Cookies
                </li>
                <li>
                  <strong>Edge:</strong> Settings &gt; Cookies and Site Permissions
                </li>
              </ul>
              <p className="mt-2">
                Note: Disabling essential cookies may prevent VoidDex from functioning properly.
              </p>
            </section>

            <section>
              <h2 className="text-xl text-void-white mb-3">5. Clearing Data</h2>
              <p>To clear all VoidDex data from your browser:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1 text-void-muted">
                <li>Open your browser&apos;s developer tools (F12)</li>
                <li>Go to Application/Storage tab</li>
                <li>Clear Local Storage and Cookies for this domain</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl text-void-white mb-3">6. Do Not Track</h2>
              <p>
                VoidDex respects Do Not Track (DNT) browser settings. When DNT is enabled, we
                disable any non-essential tracking functionality.
              </p>
            </section>

            <section>
              <h2 className="text-xl text-void-white mb-3">7. Updates to This Policy</h2>
              <p>
                We may update this Cookie Policy from time to time. Changes will be reflected in the
                &quot;Last updated&quot; date above.
              </p>
            </section>

            <section>
              <h2 className="text-xl text-void-white mb-3">8. Contact</h2>
              <p>
                For questions about our use of cookies, please contact us through our official
                channels.
              </p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
