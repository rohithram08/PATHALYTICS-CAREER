import { useState } from 'react';
import Layout from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Clock, Download, Shield, AlertTriangle } from 'lucide-react';

const SECTIONS = [
  { id: 'acceptance', label: 'Acceptance' },
  { id: 'description', label: 'Services' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'acceptable', label: 'Acceptable Use' },
  { id: 'ip', label: 'IP Rights' },
  { id: 'ai-content', label: 'AI Content' },
  { id: 'payments', label: 'Payments' },
  { id: 'termination', label: 'Termination' },
  { id: 'disclaimers', label: 'Disclaimers' },
  { id: 'liability', label: 'Liability' },
  { id: 'governing', label: 'Governing Law' },
  { id: 'contact', label: 'Contact' },
];

const KeyPoints = [
  { icon: '🎓', title: 'Age Requirement', desc: 'You must be 13+ to use Pathalytics' },
  { icon: '⚠️', title: 'Not Professional Advice', desc: 'AI recommendations are for guidance only' },
  { icon: '🔒', title: 'Your Data is Yours', desc: 'You retain full ownership of your content' },
  { icon: '📝', title: 'Updates with Notice', desc: '14 days notice before major changes' },
  { icon: '💳', title: 'Multiple Plans', desc: 'Free and premium subscriptions available' },
  { icon: '❌', title: 'Zero Tolerance', desc: 'Violations result in account suspension' },
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

  return (
    <div className={`rounded-xl border p-5 my-4 ${styles[variant]}`}>
      {children}
    </div>
  );
};

const TermsList = ({ items }) => (
  <ul className="space-y-0 mt-2">
    {items.map(({ title, desc }, i) => (
      <li key={i} className="flex gap-3 py-3 border-b border-border last:border-none text-sm">
        <span className="text-primary mt-0.5 shrink-0 font-bold">•</span>
        <span className="text-muted-foreground">
          {title && <strong className="text-foreground">{title}: </strong>}
          {desc}
        </span>
      </li>
    ))}
  </ul>
);

export default function TermsOfService() {
  const [active, setActive] = useState('acceptance');

  const scrollTo = (id) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">

        {/* ── PAGE HEADER ── */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="secondary" className="mb-4">📜 Legal Agreement</Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Terms of Service</h1>
          <p className="text-muted-foreground leading-relaxed mb-6 text-lg">
            These Terms govern your use of Pathalytics. Please read them carefully. By accessing our Services, you agree to be bound by these Terms.
          </p>

          {/* Meta Info */}
          <div className="flex gap-3 justify-center flex-wrap mb-6">
            {[
              { label: '📅 Effective', value: 'January 1, 2026' },
              { label: '📋 Version', value: '2.1' },
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
              📧 Email to Advisor
            </Button>
          </div>
        </div>

        <div className="flex gap-10 items-start max-w-6xl mx-auto">

          {/* ── SIDEBAR ── */}
          <aside className="hidden lg:block w-56 shrink-0 sticky top-24">
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-border">
                <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-3">
                  Sections
                </p>
                {SECTIONS.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => scrollTo(id)}
                    className={`w-full text-left text-sm px-3 py-2.5 rounded-lg border-l-2 transition-all mb-0.5 font-medium ${
                      active === id
                        ? 'bg-primary/10 text-primary border-primary'
                        : 'text-muted-foreground border-transparent hover:bg-accent/50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="p-3 bg-muted/30 border-t border-border">
                <p className="text-[10px] text-muted-foreground">
                  <strong>Effective:</strong> Jan 1, 2026<br/>
                  <strong>Version:</strong> 2.1
                </p>
              </div>
            </div>
          </aside>

          {/* ── MAIN CONTENT ── */}
          <main className="flex-1 min-w-0">

            {/* KEY POINTS GRID */}
            <div className="mb-12">
              <p className="text-xs font-bold tracking-widest text-primary uppercase mb-4">⚡ Key Points</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
                {KeyPoints.map(({ icon, title, desc }) => (
                  <div key={title} className="bg-card border border-border rounded-lg p-4 hover:border-primary/40 transition-colors">
                    <div className="text-3xl mb-2">{icon}</div>
                    <h4 className="text-sm font-bold text-foreground mb-1">{title}</h4>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border my-8" />

            {/* ── SECTION 01 ── */}
            <Section id="acceptance" num={1} title="Acceptance of Terms">
              <p>By accessing or using Pathalytics, you agree to be bound by these Terms, our Privacy Policy, and any additional guidelines or policies we post.</p>
              <p>If you're using Pathalytics on behalf of an organization, you represent you have authority to bind that organization to these Terms.</p>
              <p><strong className="text-foreground">If you disagree with any part of these Terms, you must not use our Services.</strong></p>
            </Section>

            <div className="border-t border-border my-8" />

            {/* ── SECTION 02 ── */}
            <Section id="description" num={2} title="Service Description">
              <p className="font-medium text-foreground mb-4">Pathalytics provides AI-powered career guidance including:</p>
              <div className="bg-card border border-border rounded-2xl overflow-hidden mb-4">
                {[
                  { emoji: '🎯', name: 'Career Recommendations', desc: 'AI-driven personalized career suggestions' },
                  { emoji: '🗺️', name: 'Career Roadmaps', desc: 'Step-by-step visual guides with milestones' },
                  { emoji: '🎤', name: 'AI Interview Coach (Alex)', desc: 'Mock interviews with instant feedback' },
                  { emoji: '💬', name: 'Career Chatbot', desc: '24/7 AI career guidance' },
                  { emoji: '💼', name: 'Job Board', desc: 'Curated listings matched to your profile' },
                ].map(({ emoji, name, desc }, i, arr) => (
                  <div key={name} className={`flex items-start gap-4 px-6 py-4 hover:bg-accent/5 transition-colors ${i < arr.length - 1 ? 'border-b border-border' : ''}`}>
                    <span className="text-2xl shrink-0">{emoji}</span>
                    <div>
                      <p className="text-sm font-bold text-foreground">{name}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p>We reserve the right to modify or discontinue any feature with reasonable notice.</p>
            </Section>

            <div className="border-t border-border my-8" />

            {/* ── SECTION 03 ── */}
            <Section id="accounts" num={3} title="User Accounts">
              <p className="font-medium text-foreground mb-4">When you create an account, you agree to:</p>
              <TermsList items={[
                { desc: 'Provide accurate, current information' },
                { desc: 'Maintain the security of your password' },
                { desc: 'Notify us immediately of unauthorized access' },
                { desc: 'Be at least 13 years old' },
                { desc: 'Accept full responsibility for all account activity' },
              ]} />

              <InfoCard variant="danger">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-rose-600 mb-2">🚨 Account Security Warning</h4>
                    <p className="text-sm">Pathalytics will NEVER ask for your password via email or phone. If you receive such a request, report it immediately to <strong className="text-foreground">security@pathalytics.com</strong>.</p>
                  </div>
                </div>
              </InfoCard>
            </Section>

            <div className="border-t border-border my-8" />

            {/* ── SECTION 04 ── */}
            <Section id="acceptable" num={4} title="Acceptable Use Policy">
              <p className="font-medium text-foreground mb-4">You agree to use Pathalytics only for lawful purposes. You must NOT:</p>
              <div className="grid sm:grid-cols-2 gap-3 my-4">
                <InfoCard variant="danger">
                  <h4 className="font-bold text-rose-600 mb-3">❌ Prohibited Actions</h4>
                  <ul className="space-y-1.5">
                    {[
                      'Harass, abuse, or harm others',
                      'Attempt unauthorized access',
                      'Scrape or copy content at scale',
                      'Upload malware or viruses',
                      'Impersonate others',
                      'Use bots without permission',
                    ].map((item) => (
                      <li key={item} className="flex gap-2 text-xs text-muted-foreground">
                        <span className="text-rose-500 shrink-0">•</span>{item}
                      </li>
                    ))}
                  </ul>
                </InfoCard>

                <InfoCard variant="success">
                  <h4 className="font-bold text-emerald-600 mb-3">✅ Permitted Use</h4>
                  <ul className="space-y-1.5">
                    {[
                      'Personal career exploration',
                      'Interview practice',
                      'Share roadmap with mentors',
                      'Provide honest feedback',
                      'Use via supported browsers',
                      'Use API if authorized',
                    ].map((item) => (
                      <li key={item} className="flex gap-2 text-xs text-muted-foreground">
                        <span className="text-emerald-500 shrink-0">•</span>{item}
                      </li>
                    ))}
                  </ul>
                </InfoCard>
              </div>
              <p className="text-sm font-medium text-rose-600">⚠️ Violations result in immediate account suspension without prior notice.</p>
            </Section>

            <div className="border-t border-border my-8" />

            {/* ── SECTION 05 ── */}
            <Section id="ip" num={5} title="Intellectual Property Rights">
              <p>All content on Pathalytics — including AI models, roadmaps, code, trademarks, logos, and designs — is owned by <strong className="text-foreground">Pathalytics, Inc.</strong> and protected by law.</p>
              
              <InfoCard variant="highlight">
                <div>
                  <h4 className="font-bold text-primary mb-2">📌 Your Content Ownership</h4>
                  <p className="text-sm">You retain full ownership of data you submit. By submitting, you grant Pathalytics a limited license to use, process, and display it solely for providing Services.</p>
                </div>
              </InfoCard>

              <p>Any feedback or suggestions you provide may be used by Pathalytics without compensation.</p>
            </Section>

            <div className="border-t border-border my-8" />

            {/* ── SECTION 06 ── */}
            <Section id="ai-content" num={6} title="AI-Generated Content & Disclaimer">
              <p className="font-medium text-foreground mb-4">Our AI generates career recommendations, roadmaps, and feedback. Please understand:</p>
              
              <div className="space-y-2 my-4">
                {[
                  '⚠️ AI content is for guidance only — NOT professional advice',
                  '📊 Recommendations are based on data patterns — not guarantees',
                  '🔍 Verify important decisions with qualified professionals',
                  '❌ AI may occasionally be inaccurate or incomplete',
                  '🎤 Alex interview feedback supplements, not replaces, real practice',
                ].map((item) => (
                  <div key={item} className="flex gap-3 text-sm text-muted-foreground p-3 rounded-lg bg-amber-500/5 border border-amber-200/30">
                    <span className="shrink-0">{item.split(' ')[0]}</span>
                    <span>{item.slice(2)}</span>
                  </div>
                ))}
              </div>

              <InfoCard variant="warning">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-600 mb-1">About Alex — AI Interviewer</h4>
                    <p className="text-sm">Alex is a practice tool. Feedback is algorithmically generated and reflects common best practices — it's not a guarantee of real interview performance.</p>
                  </div>
                </div>
              </InfoCard>
            </Section>

            <div className="border-t border-border my-8" />

            {/* ── SECTION 07 ── */}
            <Section id="payments" num={7} title="Payments & Subscriptions">
              <p className="font-medium text-foreground mb-4">Our subscription terms:</p>
              <TermsList items={[
                { desc: 'Payments processed securely via Stripe/Razorpay' },
                { desc: 'Subscription fees billed monthly or annually in advance' },
                { desc: 'Cancel anytime; takes effect at end of current billing period' },
                { desc: 'Refunds available within 7 days of purchase (annual plans only)' },
                { desc: 'Pricing may change with 30 days notice' },
                { desc: 'Prices exclude applicable taxes based on your location' },
              ]} />
            </Section>

            <div className="border-t border-border my-8" />

            {/* ── SECTION 08 ── */}
            <Section id="termination" num={8} title="Termination of Service">
              <div className="space-y-4">
                <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/40 transition-colors">
                  <h5 className="text-sm font-bold text-foreground mb-2">⬅️ Account Deletion by You</h5>
                  <p className="text-sm text-muted-foreground">Delete your account anytime via Settings. Your data is removed within 30 days per our Privacy Policy.</p>
                </div>

                <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/40 transition-colors">
                  <h5 className="text-sm font-bold text-foreground mb-2">➡️ Termination by Pathalytics</h5>
                  <p className="text-sm text-muted-foreground">We may immediately suspend/terminate your account if you violate these Terms, engage in fraud, or pose a risk to the platform.</p>
                </div>

                <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/40 transition-colors">
                  <h5 className="text-sm font-bold text-foreground mb-2">⚖️ Effect of Termination</h5>
                  <p className="text-sm text-muted-foreground">Your right to access Services ceases immediately. Sections that should survive (liability, IP, etc.) remain in effect.</p>
                </div>
              </div>
            </Section>

            <div className="border-t border-border my-8" />

            {/* ── SECTION 09 ── */}
            <Section id="disclaimers" num={9} title="Disclaimers & Warranties">
              <p className="font-medium text-foreground mb-4 uppercase">THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE"</p>
              
              <p className="text-sm text-muted-foreground mb-4">Pathalytics disclaims all warranties, including:</p>
              <TermsList items={[
                { desc: 'Warranties of merchantability or fitness for a particular purpose' },
                { desc: 'That services will be uninterrupted, error-free, or completely secure' },
                { desc: 'That AI recommendations will be accurate or suitable for your needs' },
                { desc: 'That defects will be corrected within any timeframe' },
              ]} />

              <InfoCard variant="danger">
                <p className="text-sm"><strong>⚠️ No Guarantee of Results:</strong> Using Pathalytics does not guarantee employment, salary outcomes, or career success.</p>
              </InfoCard>
            </Section>

            <div className="border-t border-border my-8" />

            {/* ── SECTION 10 ── */}
            <Section id="liability" num={10} title="Limitation of Liability">
              <p className="font-medium text-foreground mb-4 uppercase">Pathalytics is NOT liable for:</p>
              
              <div className="grid sm:grid-cols-2 gap-3 my-4">
                {[
                  { icon: '💰', title: 'Financial Losses', desc: 'Indirect damages, lost profits, or revenue loss' },
                  { icon: '🎯', title: 'Career Outcomes', desc: 'Failed employment or salary outcomes' },
                  { icon: '🔓', title: 'Third-Party Actions', desc: 'Unauthorized access or third-party failures' },
                  { icon: '⏱️', title: 'Downtime', desc: 'Service interruptions or processing delays' },
                ].map(({ icon, title, desc }) => (
                  <div key={title} className="bg-card border border-border rounded-lg p-4 hover:border-primary/40 transition-colors">
                    <div className="text-2xl mb-2">{icon}</div>
                    <h5 className="text-sm font-bold text-foreground mb-1">{title}</h5>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                ))}
              </div>

              <InfoCard variant="highlight">
                <p className="text-sm"><strong>💡 Maximum Liability:</strong> Our total liability never exceeds the amount you paid in the past 12 months or \$100 USD, whichever is greater.</p>
              </InfoCard>
            </Section>

            <div className="border-t border-border my-8" />

            {/* ── SECTION 11 ── */}
            <Section id="governing" num={11} title="Governing Law & Dispute Resolution">
              <p className="font-medium text-foreground mb-4">These Terms are governed by the laws of <strong>India</strong>, without regard to conflict of law principles.</p>
              
              <div className="space-y-3 my-4">
                {[
                  { icon: '💬', title: 'Informal Resolution (First)', desc: 'Email legal@pathalytics.com. We will attempt to resolve within 30 days.' },
                  { icon: '⚖️', title: 'Binding Arbitration', desc: 'If informal resolution fails, disputes go to arbitration in Chennai under Indian Arbitration Act, 1996.' },
                  { icon: '🚫', title: 'Class Action Waiver', desc: 'You agree to resolve disputes individually — no class actions.' },
                  { icon: '🏛️', title: 'Jurisdiction', desc: 'All legal matters fall under Chennai, Tamil Nadu courts.' },
                ].map(({ icon, title, desc }) => (
                  <div key={title} className="border border-border rounded-lg p-4 hover:border-primary/40 transition-colors">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl shrink-0">{icon}</span>
                      <div>
                        <h5 className="text-sm font-bold text-foreground mb-1">{title}</h5>
                        <p className="text-sm text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <div className="border-t border-border my-8" />

            {/* ── SECTION 12 ── */}
            <Section id="contact" num={12} title="Contact Us">
              <p className="font-medium text-foreground mb-4">Questions about these Terms?</p>
              <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
                {[
                  { icon: '⚖️', title: 'Legal Inquiries', value: 'legal@pathalytics.com' },
                  { icon: '🛠️', title: 'General Support', value: 'support@pathalytics.com' },
                  { icon: '📍', title: 'Mailing Address', value: 'Pathalytics — Chennai, Tamil Nadu, India' },
                  { icon: '⏱️', title: 'Response Time', value: '5–7 business days' },
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

              <InfoCard variant="highlight">
                <div className="flex gap-3">
                  <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-primary mb-1">📝 Important: Policy Updates</h4>
                    <p className="text-sm">We reserve the right to update these Terms anytime. We'll notify you via email and in-app at least <strong className="text-foreground">14 days</strong> before material changes take effect. Continued use means you accept the updated Terms.</p>
                  </div>
                </div>
              </InfoCard>
            </Section>

            <div className="border-t border-border my-12" />

            {/* FINAL CTA */}
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/30 rounded-2xl p-8 text-center">
              <h3 className="text-xl font-bold text-foreground mb-3">Ready to Get Started?</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                By signing up, you acknowledge you've read and agree to these Terms of Service.
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                <Button asChild size="lg" className="gap-2">
                  <a href="/signup">✅ I Agree & Sign Up</a>
                </Button>
                <Button asChild variant="outline" size="lg" className="gap-2">
                  <a href="/">← Back Home</a>
                </Button>
              </div>
            </div>

          </main>
        </div>
      </div>
    </Layout>
  );
}