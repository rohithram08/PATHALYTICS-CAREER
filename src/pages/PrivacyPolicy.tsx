import { useState } from 'react';
import Layout from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Download, ExternalLink, Search } from 'lucide-react';

const SECTIONS = [
  { id: 'overview', label: 'Overview & Scope' },
  { id: 'data-collected', label: 'Data We Collect' },
  { id: 'how-we-use', label: 'How We Use Data' },
  { id: 'data-sharing', label: 'Data Sharing' },
  { id: 'cookies', label: 'Cookies & Tracking' },
  { id: 'data-security', label: 'Data Security' },
  { id: 'data-retention', label: 'Data Retention' },
  { id: 'user-rights', label: 'Your Rights' },
  { id: 'children', label: "Children's Privacy" },
  { id: 'updates', label: 'Policy Updates' },
  { id: 'contact', label: 'Contact Us' },
];

const FAQs = [
  { q: 'Do you sell my data?', a: 'No. We never sell, rent, or trade your personal information. Period.' },
  { q: 'How long do you keep my data?', a: 'Account data is kept while your account is active plus 30 days after deletion. Usage data in anonymized form for 24 months.' },
  { q: 'Can I delete my account?', a: 'Yes, anytime. Go to Settings > Account > Delete Account. Your data is removed within 30 days.' },
  { q: 'Do you comply with GDPR/CCPA?', a: 'Yes. We comply with GDPR, CCPA, and all global privacy standards.' },
  { q: 'How are interview recordings handled?', a: 'Automatically deleted within 90 days unless you save them. Never shared or sold.' },
];

const Section = ({ id, num, title, children }) => (
  <div id={id} className="scroll-mt-24 mb-12">
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
        {String(num).padStart(2, '0')}
      </div>
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
    </div>
    <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
      {children}
    </div>
  </div>
);

const InfoCard = ({ children, variant = 'default', icon = null }) => {
  const styles = {
    default: 'bg-card border-border',
    highlight: 'bg-primary/5 border-primary/30',
    success: 'bg-emerald-500/5 border-emerald-500/25',
    warning: 'bg-amber-500/5 border-amber-500/25',
    danger: 'bg-rose-500/5 border-rose-500/25',
  };
  
  const icons = {
    check: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    alert: <AlertCircle className="w-5 h-5 text-amber-500" />,
    info: <AlertCircle className="w-5 h-5 text-primary" />,
  };

  return (
    <div className={`rounded-xl border p-5 my-4 flex gap-3 ${styles[variant]}`}>
      {icon && icons[icon]}
      <div className="flex-1">{children}</div>
    </div>
  );
};

const PrivacyPolicy = () => {
  const [active, setActive] = useState('overview');
  const [searchOpen, setSearchOpen] = useState(false);

  const scrollTo = (id) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">

        {/* ── Page Header ── */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="secondary" className="mb-4">🔒 Your Privacy Matters</Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground leading-relaxed mb-6 text-lg">
            Your privacy is fundamental to everything we build at Pathalytics. This policy explains what data we collect, why, and how we use it — in plain, honest language.
          </p>
          
          {/* Meta Info */}
          <div className="flex gap-3 justify-center flex-wrap mb-6">
            {[
              { label: '📅 Effective', value: 'January 1, 2026' },
              { label: '🔄 Updated', value: 'May 1, 2026' },
              { label: '🌍 Scope', value: 'Global' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-2 text-sm">
                <span className="text-muted-foreground">{label}:</span>
                <span className="font-semibold text-foreground">{value}</span>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-center flex-wrap">
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <ExternalLink className="w-4 h-4" />
              Print Policy
            </Button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="flex gap-10 items-start max-w-6xl mx-auto">

          {/* ── SIDEBAR NAV ── */}
          <aside className="hidden lg:block w-56 shrink-0 sticky top-24">
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {/* Search */}
              <div className="p-3 border-b border-border">
                <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <input type="text" placeholder="Search..." className="bg-transparent text-sm outline-none w-full placeholder-muted-foreground" />
                </div>
              </div>

              {/* TOC */}
              <div className="p-4">
                <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-3 px-2">
                  On This Page
                </p>
                {SECTIONS.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => scrollTo(id)}
                    className={`w-full text-left text-sm px-3 py-2.5 rounded-lg border-l-2 transition-all mb-0.5 font-medium
                      ${active === id
                        ? 'bg-primary/10 text-primary border-primary'
                        : 'text-muted-foreground border-transparent hover:bg-accent/50 hover:text-foreground'
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Info Footer */}
              <div className="border-t border-border p-3 bg-muted/30">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  <strong>Last Updated:</strong> May 1, 2026<br/>
                  <strong>Version:</strong> 2.0
                </p>
              </div>
            </div>
          </aside>

          {/* ── MAIN CONTENT ── */}
          <main className="flex-1 min-w-0">

            {/* Quick Summary */}
            <InfoCard variant="highlight" icon="info">
              <div>
                <h4 className="font-bold text-primary mb-2">📋 TL;DR Summary</h4>
                <p className="text-sm mb-3">
                  We collect account & usage data to power AI career recommendations. We <strong className="text-foreground">never sell</strong> your data. You can delete your account anytime. We comply with GDPR, CCPA, and all privacy laws.
                </p>
                <div className="flex gap-3 flex-wrap">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-200">✓ No data sales</span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-200">✓ GDPR compliant</span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-200">✓ Delete anytime</span>
                </div>
              </div>
            </InfoCard>

            <div className="border-t border-border my-8" />

            {/* 01 - Overview */}
            <Section id="overview" num={1} title="Overview & Scope">
              <p>This Privacy Policy governs the collection, use, storage, and disclosure of personal information by <strong className="text-foreground">Pathalytics</strong> when you access or use our platform, website, application, and related services.</p>
              <p>By creating an account or using our Services, you acknowledge that you have read, understood, and agree to the practices described in this Policy.</p>
              <p>This Policy applies to all users worldwide, including those in the EU (GDPR), California (CCPA), and other regions with applicable privacy legislation.</p>
            </Section>

            <div className="border-t border-border my-8" />

            {/* 02 - Data Collected */}
            <Section id="data-collected" num={2} title="Data We Collect">
              <p className="font-medium text-foreground mb-4">We collect the following information to provide and improve our Services:</p>
              <div className="grid sm:grid-cols-2 gap-3 my-4">
                {[
                  { icon: '👤', title: 'Account Info', desc: 'Name, email, password (hashed), profile photo, preferences' },
                  { icon: '🎓', title: 'Career Data', desc: 'Education, experience, skills, goals, assessment responses' },
                  { icon: '📊', title: 'Usage Data', desc: 'Pages visited, features used, interaction patterns' },
                  { icon: '🖥', title: 'Technical Data', desc: 'IP address, browser type, device info, session data' },
                ].map(({ icon, title, desc }) => (
                  <div key={title} className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors">
                    <div className="text-2xl mb-2">{icon}</div>
                    <h5 className="text-xs font-bold text-foreground mb-1">{title}</h5>
                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>

              <InfoCard variant="success" icon="check">
                <div>
                  <h4 className="font-bold text-emerald-600 mb-2">What We Never Collect</h4>
                  <p className="text-sm">We do NOT collect: SSN, government IDs, financial accounts, medical info, or biometric data.</p>
                </div>
              </InfoCard>
            </Section>

            <div className="border-t border-border my-8" />

            {/* 03 - How We Use Data */}
            <Section id="how-we-use" num={3} title="How We Use Your Data">
              <p className="font-medium text-foreground mb-4">Your data powers these core features:</p>
              <div className="space-y-2 my-4">
                {[
                  '🎯 Personalized Career Recommendations — Matching you with relevant paths',
                  '📍 Roadmap Generation — Creating step-by-step guides tailored to you',
                  '🎤 AI Interview Coaching — Analyzing responses for feedback',
                  '⚡ Platform Improvement — Analyzing usage to enhance features',
                  '💬 Communications — Sending updates (with your consent)',
                  '🛡️ Safety & Security — Detecting fraud and unauthorized access',
                  '📜 Legal Compliance — Meeting applicable laws',
                ].map((item) => (
                  <div key={item} className="flex gap-3 text-sm text-muted-foreground p-3 rounded-lg hover:bg-accent/5 transition-colors">
                    <span className="shrink-0">{item.split(' ')[0]}</span>
                    <span>{item.slice(2)}</span>
                  </div>
                ))}
              </div>

              <InfoCard variant="highlight" icon="info">
                <div>
                  <h4 className="font-bold text-primary mb-2">🚫 We Never Sell Your Data</h4>
                  <p className="text-sm">Pathalytics does not sell, rent, or trade your personal information for marketing or any other purpose.</p>
                </div>
              </InfoCard>
            </Section>

            <div className="border-t border-border my-8" />

            {/* 04 - Data Sharing */}
            <Section id="data-sharing" num={4} title="Data Sharing & Disclosure">
              <p className="font-medium text-foreground mb-4">We share data only in these limited situations:</p>
              <div className="space-y-2 my-4">
                {[
                  { title: '🤝 Trusted Service Providers', desc: 'Third-party vendors under strict confidentiality agreements' },
                  { title: '🤖 AI & ML Partners', desc: 'Only anonymized, aggregated data — never personally identifiable' },
                  { title: '⚖️ Legal Requirements', desc: 'If required by law or court order (with notice when possible)' },
                  { title: '💼 Business Transfers', desc: 'In case of merger/acquisition, we notify users 30 days in advance' },
                  { title: '✅ With Your Consent', desc: 'Any other sharing requires your explicit prior approval' },
                ].map(({ title, desc }) => (
                  <div key={title} className="border border-border rounded-lg p-4 hover:border-primary/40 transition-colors">
                    <h5 className="text-sm font-bold text-foreground mb-1">{title}</h5>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                ))}
              </div>
            </Section>

            <div className="border-t border-border my-8" />

            {/* 05 - Cookies */}
            <Section id="cookies" num={5} title="Cookies & Tracking Technologies">
              <p className="font-medium text-foreground mb-4">We use cookies to enhance your experience:</p>
              <div className="grid sm:grid-cols-2 gap-3 my-4">
                {[
                  { title: '🔧 Essential', desc: 'Authentication and session management' },
                  { title: '📊 Analytics', desc: 'Understanding how you use the platform' },
                  { title: '⚙️ Preference', desc: 'Remembering your theme, language, settings' },
                  { title: '🚫 Marketing', desc: 'We do NOT use advertising or tracking cookies' },
                ].map(({ title, desc }) => (
                  <div key={title} className="bg-card border border-border rounded-lg p-3">
                    <p className="text-xs font-bold text-foreground mb-1">{title}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">You can disable non-essential cookies in your browser settings anytime.</p>
            </Section>

            <div className="border-t border-border my-8" />

            {/* 06 - Security */}
            <Section id="data-security" num={6} title="Data Security">
              <p className="font-medium text-foreground mb-4">We protect your data with industry-standard security:</p>
              <div className="space-y-2 my-4">
                {[
                  '🔐 TLS 1.3 encryption for all data in transit',
                  '🔒 bcrypt hashing for passwords with unique salt',
                  '☁️ SOC 2 Type II certified cloud infrastructure',
                  '👤 Role-based access controls for personnel',
                  '🔍 Regular third-party penetration testing',
                ].map((item) => (
                  <div key={item} className="flex gap-3 text-sm text-muted-foreground p-3 rounded-lg bg-emerald-500/5 border border-emerald-200/30">
                    <span className="shrink-0 text-emerald-600 font-bold">✓</span>
                    <span>{item.slice(2)}</span>
                  </div>
                ))}
              </div>

              <InfoCard variant="warning" icon="alert">
                <div>
                  <h4 className="font-bold text-amber-600 mb-2">⚠️ Breach Notification</h4>
                  <p className="text-sm">In case of a data breach, we notify affected users within 72 hours as required by law.</p>
                </div>
              </InfoCard>
            </Section>

            <div className="border-t border-border my-8" />

            {/* 07 - Retention */}
            <Section id="data-retention" num={7} title="Data Retention">
              <p className="font-medium text-foreground mb-4">How long we keep your data:</p>
              <div className="space-y-2 my-4">
                {[
                  { title: 'Account Data', desc: 'For duration of account + 30 days after deletion request' },
                  { title: 'Usage & Analytics', desc: 'Anonymized data kept for up to 24 months' },
                  { title: 'Interview Recordings', desc: 'Auto-deleted within 90 days (unless you save)' },
                  { title: 'Legal Hold', desc: 'May be retained longer if required by law' },
                ].map(({ title, desc }) => (
                  <div key={title} className="bg-card border border-border rounded-lg p-4 hover:border-primary/40 transition-colors">
                    <h5 className="text-sm font-bold text-foreground mb-1">{title}</h5>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                ))}
              </div>
            </Section>

            <div className="border-t border-border my-8" />

            {/* 08 - Your Rights */}
            <Section id="user-rights" num={8} title="Your Privacy Rights">
              <p className="font-medium text-foreground mb-4">You have the right to:</p>
              <div className="grid sm:grid-cols-2 gap-3 my-4">
                {[
                  { icon: '👁️', title: 'Access', desc: 'Download all your data' },
                  { icon: '✏️', title: 'Rectify', desc: 'Correct inaccurate info' },
                  { icon: '🗑️', title: 'Erasure', desc: 'Delete your account & data' },
                  { icon: '📦', title: 'Portability', desc: 'Export in machine format' },
                  { icon: '🚫', title: 'Object', desc: 'Opt out of processing' },
                  { icon: '⏸️', title: 'Restrict', desc: 'Pause data processing' },
                ].map(({ icon, title, desc }) => (
                  <div key={title} className="bg-card border border-border rounded-lg p-4 hover:border-primary/40 transition-colors">
                    <div className="text-2xl mb-2">{icon}</div>
                    <h5 className="text-sm font-bold text-foreground mb-1">Right to {title}</h5>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                To exercise any right, email <strong className="text-foreground">privacy@pathalytics.com</strong>. We respond within 30 days.
              </p>
            </Section>

            <div className="border-t border-border my-8" />

            {/* 09 - Children */}
            <Section id="children" num={9} title="Children's Privacy">
              <p>Pathalytics is not directed to anyone under <strong className="text-foreground">13 years old</strong>. We do not knowingly collect information from children under 13.</p>
              <p className="mt-3">If we learn a child under 13 has provided information, we immediately delete it. Contact <strong className="text-foreground">privacy@pathalytics.com</strong> if this occurs.</p>
            </Section>

            <div className="border-t border-border my-8" />

            {/* 10 - Updates */}
            <Section id="updates" num={10} title="Policy Updates">
              <p className="font-medium text-foreground mb-4">When we update this policy, we will:</p>
              <ul className="space-y-2">
                {[
                  '📝 Post the updated policy with a new date',
                  '📧 Email all users 14 days before changes take effect',
                  '🔔 Display an in-app notice',
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-muted-foreground p-3 rounded-lg hover:bg-accent/5">
                    <span className="shrink-0">{item.split(' ')[0]}</span>
                    <span>{item.slice(2)}</span>
                  </li>
                ))}
              </ul>
            </Section>

            <div className="border-t border-border my-8" />

            {/* 11 - Contact */}
            <Section id="contact" num={11} title="Contact Us">
              <p className="font-medium text-foreground mb-4">Have privacy questions?</p>
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                {[
                  { icon: '📧', title: 'Email', value: 'privacy@pathalytics.com' },
                  { icon: '📍', title: 'Address', value: 'Pathalytics — Chennai, Tamil Nadu, India' },
                  { icon: '⏱️', title: 'Response Time', value: '30 business days' },
                ].map(({ icon, title, value }, i, arr) => (
                  <div key={title} className={`flex items-start gap-4 px-6 py-5 hover:bg-accent/5 transition-colors ${i < arr.length - 1 ? 'border-b border-border' : ''}`}>
                    <span className="text-2xl shrink-0">{icon}</span>
                    <div>
                      <p className="text-sm font-bold text-foreground mb-0.5">{title}</p>
                      <p className="text-sm text-muted-foreground">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <div className="border-t border-border my-8" />

            {/* FAQ Section */}
            <div className="my-12">
              <p className="text-xs font-bold tracking-widest text-primary uppercase mb-4">❓ Frequently Asked Questions</p>
              <h3 className="text-2xl font-bold text-foreground mb-6">Common Privacy Questions</h3>
              <div className="space-y-3">
                {FAQs.map(({ q, a }) => (
                  <details key={q} className="group bg-card border border-border rounded-xl p-5 cursor-pointer hover:border-primary/40 transition-colors">
                    <summary className="font-bold text-foreground flex items-center justify-between">
                      {q}
                      <span className="text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-3 pt-3 border-t border-border">{a}</p>
                  </details>
                ))}
              </div>
            </div>

          </main>
        </div>
      </div>
    </Layout>
  );
};

export default PrivacyPolicy;