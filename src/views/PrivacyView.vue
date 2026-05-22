<template>
  <div class="privacy-page">
    <!-- Header -->
    <div class="privacy-hero">
      <div class="privacy-hero-inner">
        <div class="privacy-badge">Legal</div>
        <h1 class="privacy-title">Privacy Policy</h1>
        <p class="privacy-subtitle">Last updated: April 4, 2026</p>
      </div>
    </div>

    <!-- Content -->
    <div class="privacy-content">
      <div class="privacy-toc">
        <div class="toc-label">On this page</div>
        <a v-for="s in sections" :key="s.id" :href="'#'+s.id" class="toc-link">{{ s.title }}</a>
      </div>

      <div class="privacy-body">

        <div class="privacy-intro">
          Ultimate Fantasy Dashboard ("UFD", "we", "our", or "us") is committed to protecting your privacy.
          This policy explains what information we collect, how we use it, and what choices you have.
          By using UFD, you agree to the practices described here.
        </div>

        <section id="information-we-collect" class="privacy-section">
          <h2>1. Information We Collect</h2>

          <h3>Account Information</h3>
          <p>When you create an account, we collect your name and email address — either directly or through Google OAuth. We do not store your Google password.</p>

          <h3>Fantasy League Data</h3>
          <p>To power your dashboard, we access fantasy sports data from platforms you connect — ESPN, Yahoo Fantasy, and Sleeper. This includes league standings, rosters, matchup scores, and historical results. We access only what is necessary to display your dashboard and do not store player-level personal data beyond what your fantasy platform provides.</p>

          <h3>Payment Information</h3>
          <p>Payments are processed by Stripe. We do not store your credit card number, CVV, or full payment details on our servers. We retain your Stripe customer ID and subscription status to manage your access.</p>

          <h3>Usage Data</h3>
          <p>We may collect basic usage information such as pages visited and features used, to improve the product. This data is aggregated and not linked to personally identifiable information.</p>

          <h3>ESPN Cookie Data</h3>
          <p>If you use our ESPN Chrome extension to connect private leagues, your ESPN authentication cookies (espn_s2 and SWID) are transmitted securely to our servers to authenticate API requests on your behalf. These credentials are encrypted at rest and are never shared with third parties.</p>
        </section>

        <section id="how-we-use-information" class="privacy-section">
          <h2>2. How We Use Your Information</h2>
          <ul>
            <li>To create and manage your account</li>
            <li>To connect to your fantasy platforms and display your league data</li>
            <li>To process payments and manage your subscription or League Pass</li>
            <li>To send you transactional emails (account confirmation, billing receipts)</li>
            <li>To send you product-related emails if you have an account and have not opted out</li>
            <li>To improve the product based on aggregated usage patterns</li>
            <li>To comply with legal obligations</li>
          </ul>
          <p>We do not sell your personal data. We do not use your data for advertising targeting on third-party platforms.</p>
        </section>

        <section id="data-sharing" class="privacy-section">
          <h2>3. Data Sharing</h2>
          <p>We share your data only with the following third parties, solely to operate the service:</p>
          <div class="privacy-table">
            <div class="pt-row pt-header">
              <span>Service</span><span>Purpose</span><span>Privacy Policy</span>
            </div>
            <div class="pt-row">
              <span>Supabase</span><span>Database & authentication</span>
              <a href="https://supabase.com/privacy" target="_blank" rel="noopener">supabase.com/privacy</a>
            </div>
            <div class="pt-row">
              <span>Stripe</span><span>Payment processing</span>
              <a href="https://stripe.com/privacy" target="_blank" rel="noopener">stripe.com/privacy</a>
            </div>
            <div class="pt-row">
              <span>Vercel</span><span>Hosting & infrastructure</span>
              <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener">vercel.com/legal/privacy-policy</a>
            </div>
            <div class="pt-row">
              <span>Resend</span><span>Transactional email</span>
              <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener">resend.com/legal/privacy-policy</a>
            </div>
            <div class="pt-row">
              <span>Google</span><span>OAuth sign-in</span>
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">policies.google.com/privacy</a>
            </div>
          </div>
          <p>We do not share your data with any other third parties unless required by law.</p>
        </section>

        <section id="data-retention" class="privacy-section">
          <h2>4. Data Retention</h2>
          <p>We retain your account data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where we are required to retain it for legal or financial compliance purposes (such as billing records, which Stripe retains per their own policies).</p>
          <p>Cached fantasy league data is refreshed regularly and historical data is retained to power your History features. You may request deletion of your account and associated data at any time.</p>
        </section>

        <section id="your-rights" class="privacy-section">
          <h2>5. Your Rights</h2>
          <p>Depending on where you live, you may have the right to:</p>
          <ul>
            <li><strong>Access</strong> — request a copy of the personal data we hold about you</li>
            <li><strong>Correction</strong> — request that we correct inaccurate data</li>
            <li><strong>Deletion</strong> — request that we delete your account and personal data</li>
            <li><strong>Portability</strong> — request your data in a machine-readable format</li>
            <li><strong>Opt out of emails</strong> — unsubscribe from non-transactional emails at any time</li>
          </ul>
          <p>To exercise any of these rights, email us at <a href="mailto:support@ultimatefantasydashboard.com">support@ultimatefantasydashboard.com</a>. We will respond within 30 days.</p>
        </section>

        <section id="cookies" class="privacy-section">
          <h2>6. Cookies &amp; Local Storage</h2>
          <p>UFD uses browser local storage to remember your preferences (such as your selected league and dismissed UI elements). We use Supabase session cookies to keep you logged in. We do not use third-party advertising cookies.</p>
          <p>If you use our Chrome extension, it accesses ESPN cookies only on espn.com domains, solely to authenticate your league connection. The extension does not track your browsing activity.</p>
        </section>

        <section id="security" class="privacy-section">
          <h2>7. Security</h2>
          <p>We take reasonable measures to protect your data including HTTPS encryption in transit, encrypted storage of sensitive credentials, and access controls limiting who can access production data. No method of transmission over the internet is 100% secure — we cannot guarantee absolute security but we take it seriously.</p>
        </section>

        <section id="children" class="privacy-section">
          <h2>8. Children's Privacy</h2>
          <p>UFD is not intended for users under the age of 13. We do not knowingly collect personal data from children. If you believe a child has provided us with personal information, please contact us and we will delete it promptly.</p>
        </section>

        <section id="changes" class="privacy-section">
          <h2>9. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. When we do, we will update the "Last updated" date at the top of this page. For significant changes, we will notify you by email or by a notice within the app. Continued use of UFD after changes constitutes acceptance of the updated policy.</p>
        </section>

        <section id="contact" class="privacy-section">
          <h2>10. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy or how we handle your data:</p>
          <div class="privacy-contact">
            <div class="pc-item">
              <span class="pc-label">Email</span>
              <a href="mailto:support@ultimatefantasydashboard.com">support@ultimatefantasydashboard.com</a>
            </div>
            <div class="pc-item">
              <span class="pc-label">Website</span>
              <a href="https://ultimatefantasydashboard.com">ultimatefantasydashboard.com</a>
            </div>
          </div>
        </section>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const sections = [
  { id: 'information-we-collect', title: '1. Information We Collect' },
  { id: 'how-we-use-information', title: '2. How We Use Your Information' },
  { id: 'data-sharing', title: '3. Data Sharing' },
  { id: 'data-retention', title: '4. Data Retention' },
  { id: 'your-rights', title: '5. Your Rights' },
  { id: 'cookies', title: '6. Cookies & Local Storage' },
  { id: 'security', title: '7. Security' },
  { id: 'children', title: '8. Children\'s Privacy' },
  { id: 'changes', title: '9. Changes to This Policy' },
  { id: 'contact', title: '10. Contact Us' },
]
</script>

<style scoped>
.privacy-page {
  min-height: 100vh;
  background: #05060a;
  color: #e5e7eb;
  font-family: inherit;
}

/* ── Hero ── */
.privacy-hero {
  background: linear-gradient(135deg, #0a0c14 0%, #0c0f1c 100%);
  border-bottom: 1px solid #1e2130;
  padding: 64px 24px 48px;
  position: relative;
  overflow: hidden;
}
.privacy-hero::before {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, #22c55e 30%, #06b6d4 70%, transparent);
}
.privacy-hero-inner {
  max-width: 860px;
  margin: 0 auto;
}
.privacy-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #22c55e;
  background: rgba(34,197,94,0.1);
  border: 1px solid rgba(34,197,94,0.25);
  padding: 4px 12px;
  border-radius: 20px;
  margin-bottom: 16px;
}
.privacy-title {
  font-size: clamp(32px, 5vw, 52px);
  font-weight: 900;
  color: #fff;
  letter-spacing: -0.02em;
  margin: 0 0 12px;
  font-family: 'Barlow Condensed', sans-serif;
}
.privacy-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

/* ── Layout ── */
.privacy-content {
  max-width: 1100px;
  margin: 0 auto;
  padding: 48px 24px 80px;
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 48px;
  align-items: start;
}
@media (max-width: 768px) {
  .privacy-content { grid-template-columns: 1fr; }
  .privacy-toc { display: none; }
}

/* ── TOC ── */
.privacy-toc {
  position: sticky;
  top: 100px;
  background: #0a0c14;
  border: 1px solid #1e2130;
  border-radius: 12px;
  padding: 16px;
}
.toc-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #374151;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #1e2130;
}
.toc-link {
  display: block;
  font-size: 12px;
  color: #6b7280;
  text-decoration: none;
  padding: 5px 0;
  border-left: 2px solid transparent;
  padding-left: 10px;
  margin-left: -10px;
  transition: all 0.15s;
  line-height: 1.4;
}
.toc-link:hover { color: #22c55e; border-left-color: #22c55e; }

/* ── Body ── */
.privacy-intro {
  font-size: 15px;
  color: #9ca3af;
  line-height: 1.8;
  padding: 20px 24px;
  background: #0a0c14;
  border: 1px solid #1e2130;
  border-left: 3px solid #22c55e;
  border-radius: 10px;
  margin-bottom: 40px;
}

.privacy-section {
  margin-bottom: 48px;
  scroll-margin-top: 100px;
}
.privacy-section h2 {
  font-size: 22px;
  font-weight: 800;
  color: #fff;
  margin: 0 0 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid #1e2130;
  font-family: 'Barlow Condensed', sans-serif;
  letter-spacing: 0.01em;
}
.privacy-section h3 {
  font-size: 14px;
  font-weight: 700;
  color: #e5e7eb;
  margin: 20px 0 8px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 12px;
  color: #9ca3af;
}
.privacy-section p {
  font-size: 14px;
  color: #9ca3af;
  line-height: 1.8;
  margin: 0 0 14px;
}
.privacy-section ul {
  margin: 0 0 14px;
  padding-left: 0;
  list-style: none;
}
.privacy-section ul li {
  font-size: 14px;
  color: #9ca3af;
  line-height: 1.7;
  padding: 4px 0 4px 20px;
  position: relative;
}
.privacy-section ul li::before {
  content: '→';
  position: absolute;
  left: 0;
  color: #22c55e;
  font-size: 12px;
}
.privacy-section strong { color: #e5e7eb; font-weight: 600; }
.privacy-section a { color: #22c55e; text-decoration: none; }
.privacy-section a:hover { text-decoration: underline; }

/* ── Table ── */
.privacy-table {
  border: 1px solid #1e2130;
  border-radius: 10px;
  overflow: hidden;
  margin: 16px 0 20px;
}
.pt-row {
  display: grid;
  grid-template-columns: 1fr 1.5fr 1.5fr;
  gap: 12px;
  padding: 10px 16px;
  font-size: 13px;
  border-bottom: 1px solid #0f1017;
}
.pt-row:last-child { border-bottom: none; }
.pt-header {
  background: #0a0c14;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #4b5563;
}
.pt-row span { color: #9ca3af; }
.pt-row a { color: #06b6d4; font-size: 12px; text-decoration: none; }
.pt-row a:hover { text-decoration: underline; }

/* ── Contact ── */
.privacy-contact {
  background: #0a0c14;
  border: 1px solid #1e2130;
  border-radius: 10px;
  overflow: hidden;
  margin-top: 16px;
}
.pc-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border-bottom: 1px solid #0f1017;
}
.pc-item:last-child { border-bottom: none; }
.pc-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #4b5563;
  width: 60px;
  flex-shrink: 0;
}
.pc-item a {
  font-size: 13px;
  color: #22c55e;
  text-decoration: none;
}
.pc-item a:hover { text-decoration: underline; }
</style>
