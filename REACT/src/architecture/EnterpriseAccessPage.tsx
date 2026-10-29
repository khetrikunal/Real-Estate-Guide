import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowRight, ArrowUpRight, BarChart3, Check, ChevronRight, Eye, EyeOff, Layers3, LoaderCircle, LockKeyhole, Mail, Users, Workflow } from 'lucide-react';
import { useAppReducedMotion } from '../motion';
import { VideoBackground } from './VideoBackground';
import realestateLogo from '../assets/realestateLogo.jpeg';
import { useAuth } from '../auth/AuthContext';
import { Input } from '../v0/components/ui/input';
import { Button } from '../v0/components/ui/button';
import { Label } from '../v0/components/ui/label';
import './enterprise.css';

const capabilities = [
  { id: 'properties', icon: Layers3, label: 'Property intelligence', title: 'Your portfolio. A clearer perspective.', description: 'Bring projects, configurations, pricing, and availability together. Find the right property without losing the bigger picture.', steps: ['Discover properties', 'Compare configurations', 'Manage inventory'], detail: 'Projects, documents, and unit details — connected.', tag: 'PORTFOLIO WORKSPACE' },
  { id: 'relationships', icon: Users, label: 'Client relationships', title: 'Keep the conversation moving.', description: 'Organize enquiries, follow up with clients, and keep your team aligned through every stage of the relationship.', steps: ['Capture an enquiry', 'Plan the follow-up', 'Move the relationship forward'], detail: 'CRM, follow-ups, and team conversations — connected.', tag: 'RELATIONSHIP WORKSPACE' },
  { id: 'insights', icon: BarChart3, label: 'Business overview', title: 'See the details. Understand the direction.', description: 'Connect your sales activity with your portfolio. Get a focused view of the work that matters and your next opportunities.', steps: ['Review activity', 'Explore analytics', 'Decide your next move'], detail: 'Sales, portfolio activity, and analytics — connected.', tag: 'BUSINESS WORKSPACE' },
] as const;

export default function EnterpriseAccessPage() {
  const reduced = useAppReducedMotion();
  const [active, setActive] = useState(0);
  const capability = capabilities[active];
  const ActiveIcon = capability.icon;
  return <div className="enterprise-page">
    <VideoBackground />
    <header className="enterprise-nav">
      <Link href="/" className="enterprise-brand"><img src={realestateLogo} alt="" /><span>RealEstate<span className="enterprise-brand__light">Guide</span><span className="enterprise-brand__dot">.</span></span></Link>
      <nav aria-label="Page navigation"><a href="#platform">The platform</a><a href="#workspace-access">Workspace access <ArrowUpRight size={12} /></a></nav>
      <a className="enterprise-nav__cta" href="#workspace-access">Sign in <ArrowUpRight size={14} /></a>
    </header>
    <main className="enterprise-main">
      <motion.section className="enterprise-intro" initial={reduced ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }}>
        <div className="enterprise-release"><span className="enterprise-status-dot" /><span>THE CONNECTED REAL ESTATE WORKSPACE</span><ChevronRight size={12} /></div>
        <h1><span className="enterprise-headline-line">Every property.</span><span className="enterprise-headline-line enterprise-headline-secondary">Every opportunity.</span><span className="enterprise-headline-accent">One workspace.</span></h1>
        <p className="enterprise-lead">The bigger picture. The finer details. Bring your portfolio, clients, and team together in one place built for your next move.</p>
        <a className="enterprise-explore" href="#platform">Explore your workspace <ArrowDown size={13} /></a>
        <section id="platform" className="enterprise-platform" aria-label="Explore platform capabilities">
          <div className="enterprise-platform__bar"><span><Workflow size={14} /> BUILT AROUND YOUR BUSINESS</span><span className="enterprise-platform__indicator">WORKSPACE OVERVIEW</span></div>
          <div className="enterprise-tabs" role="tablist" aria-label="Platform capabilities">
            {capabilities.map((item, i) => <button key={item.id} role="tab" id={`capability-${item.id}`} aria-selected={active === i} aria-controls="capability-panel" tabIndex={active === i ? 0 : -1}
              onClick={() => setActive(i)} onKeyDown={event => {
                const next = event.key === 'ArrowRight' ? (i + 1) % capabilities.length : event.key === 'ArrowLeft' ? (i + capabilities.length - 1) % capabilities.length : event.key === 'Home' ? 0 : event.key === 'End' ? capabilities.length - 1 : null;
                if (next !== null) { event.preventDefault(); setActive(next); document.getElementById(`capability-${capabilities[next].id}`)?.focus(); }
              }}><item.icon size={14} /><span>{item.label}</span></button>)}
          </div>
          <div id="capability-panel" role="tabpanel" aria-labelledby={`capability-${capability.id}`} tabIndex={0}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={capability.id} className="enterprise-capability" initial={reduced ? false : { opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .16 }}>
                <div className="enterprise-capability__heading"><div className="enterprise-capability__icon"><ActiveIcon size={21} /></div><span>{capability.tag}</span><ArrowUpRight size={16} /></div>
                <h2>{capability.title}</h2><p>{capability.description}</p>
                <div className="enterprise-workflow">{capability.steps.map((step, i) => <div key={step}><span className="enterprise-step">0{i + 1}</span><span>{step}</span>{i < 2 && <ChevronRight size={12} />}</div>)}</div>
                <div className="enterprise-capability__foot"><Check size={12} />{capability.detail}</div>
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
      </motion.section>
      <motion.aside id="workspace-access" className="enterprise-access" initial={reduced ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5, delay: reduced ? 0 : .1 }}>
        <LoginPanel />
        <div className="enterprise-access__note"><span className="enterprise-note-icon"><Layers3 size={16} /></span><p><strong>A place for every part of your business.</strong><br />One sign-in. Your role. Your workspace.</p></div>
      </motion.aside>
    </main>
    <footer className="enterprise-footer"><span>RealEstate Guide <span className="enterprise-footer__divider">/</span> Built for the way real estate moves.</span><span>PROPERTY <span>·</span> PEOPLE <span>·</span> PROGRESS</span></footer>
  </div>;
}

function LoginPanel() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function onSubmit(event: React.FormEvent) {
    event.preventDefault(); setError(''); setBusy(true);
    try { const role = await login(email, password); navigate(`/${role}/overview`, { replace: true }); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to sign in'); }
    finally { setBusy(false); }
  }
  return <div className="enterprise-login">
    <div className="enterprise-login__eyebrow"><span className="enterprise-login__mark"><LockKeyhole size={17} /></span> ONE LOGIN. EVERY WORKSPACE.</div>
    <h2>Welcome back<span>.</span></h2><p className="enterprise-login__description">Sign in to keep your business moving.</p>
    <form onSubmit={onSubmit}>
      <div className="enterprise-field"><Label htmlFor="lp-email">Work email</Label><div className="enterprise-field__input"><Mail size={16} /><Input id="lp-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" required disabled={busy} /></div></div>
      <div className="enterprise-field"><div className="enterprise-field__label"><Label htmlFor="lp-password">Password</Label><Link href="/forgot-password">Forgot password?</Link></div><div className="enterprise-field__input"><LockKeyhole size={16} /><Input id="lp-password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" required disabled={busy} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <Eye size={16} /> : <EyeOff size={16} />}</button></div></div>
      {error && <div className="enterprise-login__error" role="alert">{error}</div>}
      <Button className="enterprise-login__submit" type="submit" disabled={busy}>{busy ? <><LoaderCircle size={17} className="animate-spin" /> Signing in…</> : <>Sign in to workspace <ArrowRight size={17} /></>}</Button>
    </form>
    <div className="enterprise-account-access"><Users size={15} /><p><strong>Need access?</strong><br />Contact the administrator who manages your account.</p></div>
    <p className="enterprise-login__footnote">Your role is detected automatically after sign-in.</p>
  </div>;
}

