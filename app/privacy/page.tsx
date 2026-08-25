import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Forge",
  description: "How Forge handles Google account and workout data.",
};

export default function PrivacyPage() {
  return (
    <main className="legal-shell">
      <header className="legal-header">
        <a className="wordmark" href="/" aria-label="Back to Forge">
          <span className="mark">F</span><span>FORGE</span>
        </a>
        <a href="/">Back to workouts</a>
      </header>

      <article className="legal-card">
        <p className="kicker">PRIVACY POLICY</p>
        <h1>Your workout data stays yours.</h1>
        <p className="legal-updated">Effective August 25, 2026</p>

        <section>
          <h2>What Forge accesses</h2>
          <p>When you connect Google, Forge requests your Google account email address and permission to view and update Google Sheets. Forge uses that access only to identify your connection and to create and update workout entries in the spreadsheets used by the app.</p>
        </section>

        <section>
          <h2>What Forge stores</h2>
          <p>Forge stores your Google account email address, an encrypted Google authorization token, and workout-session information needed to keep your workout log in sync. Your Google password is never received or stored by Forge.</p>
        </section>

        <section>
          <h2>How information is used</h2>
          <p>Your information is used only to provide the workout logging features you request. Forge does not sell your information, use it for advertising, or share it with third parties except service providers required to operate the app or when required by law.</p>
        </section>

        <section>
          <h2>Retention and deletion</h2>
          <p>Connection and workout data is kept while you use Forge. You can revoke Forge’s access at any time from your Google Account permissions. To request deletion of Forge’s stored connection or workout data, contact the developer at <a href="mailto:zhanhangsky@gmail.com">zhanhangsky@gmail.com</a>.</p>
        </section>

        <section>
          <h2>Google API data</h2>
          <p>Forge’s use and transfer of information received from Google APIs complies with the Google API Services User Data Policy, including the Limited Use requirements.</p>
        </section>

        <section>
          <h2>Security and changes</h2>
          <p>Forge uses reasonable safeguards, including encryption of stored Google authorization tokens. This policy may be updated as the app changes; the effective date above will be revised when that happens.</p>
        </section>
      </article>
    </main>
  );
}
