import Link from "next/link";
import type { Metadata } from "next";
import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppReducedMotion } from "@app/motion";
import {
  Mail, Lock, Eye, EyeOff, LoaderCircle, ArrowRight,
  BookOpen, TrendingUp, ShieldCheck, Lightbulb, ChevronRight
} from "lucide-react";

import { Logomark } from "@/components/brand/logo";
import realestateLogo from "@app/assets/realestateLogo.jpeg";
import { ROLE_ORDER, ROLES, type RoleKey } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@app/auth/AuthContext";
import { motionEase } from "../../../motion";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "RealEstate-Guide — Your Trusted Guide to Real Estate Success",
  description: "Expert insights, step-by-step guides, and smart strategies to help you buy, sell, and invest in properties with confidence.",
};

const FEATURES = [
  { icon: BookOpen, label: "In-Depth Guides" },
  { icon: TrendingUp, label: "Market Insights" },
  { icon: ShieldCheck, label: "Expert Advice" },
  { icon: Lightbulb, label: "Smart Strategies" },
];

const GUIDE_CARDS = [
  {
    icon: "🏠",
    title: "Buying Guide",
    description: "Step-by-step support to find your dream property.",
    href: "/login/subadmin",
  },
  {
    icon: "🤝",
    title: "Selling Guide",
    description: "Proven strategies to sell your property for the best value.",
    href: "/login/admin",
  },
  {
    icon: "📈",
    title: "Market Insights",
    description: "Stay updated with the latest trends and price analysis.",
    href: "/login/superadmin",
  },
  {
    icon: "🏢",
    title: "Investment Guide",
    description: "Smart investment tips to grow your wealth through real estate.",
    href: "/login/employee",
  },
];

const STATS = [
  { value: "12K+", label: "Properties Listed" },
  { value: "8K+", label: "Happy Clients" },
  { value: "25+", label: "Cities Covered" },
  { value: "15+", label: "Years of Experience" },
];

export default function RolesPage() {
  const reduceMotion = useAppReducedMotion();

  return (
    <div className="rg-landing relative min-h-svh overflow-x-hidden bg-[#0d1b3e]">
      {/* ── Hero section with background image overlay ── */}
      <div className="relative min-h-svh">
        {/* Background image overlay */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1600&q=80')`,
          }}
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#0d1b3e]/95 via-[#0d1b3e]/75 to-[#0d1b3e]/30" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0d1b3e]" />

        {/* ── Top Navigation ── */}
        <motion.header
          className="relative z-20 flex items-center justify-between px-8 py-6 lg:px-16"
          initial={reduceMotion ? false : { opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0.001 } : { duration: 0.5, ease: motionEase.entrance }}
        >
          <Link href="/" className="flex items-center gap-3">
            <img src={realestateLogo} alt="RealEstate Guide Logo" className="h-10 w-10 rounded-lg object-cover" />
            <div className="leading-none">
              <div className="text-[15px] font-bold tracking-tight text-white">RealEstate</div>
              <div className="text-[9px] font-semibold tracking-[0.22em] text-[#c9a84c] uppercase">— Guide —</div>
            </div>
          </Link>
          <Link
            href="/signup/subadmin"
            className="rg-btn-gold inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
          >
            Create Account
          </Link>
        </motion.header>

        {/* ── Hero Content + Login Card ── */}
        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-80px)] max-w-7xl flex-col items-center justify-center gap-12 px-8 py-12 lg:flex-row lg:items-center lg:px-16 lg:gap-16">
          {/* Left: Hero Text */}
          <motion.div
            className="max-w-xl flex-1"
            initial={reduceMotion ? false : { opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={reduceMotion ? { duration: 0.001 } : { duration: 0.6, ease: motionEase.entrance }}
          >
            <p className="mb-4 text-[11px] font-semibold tracking-[0.28em] text-[#c9a84c] uppercase">
              Welcome to Real Estate Guide
            </p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.08] tracking-tight text-white">
              Your Trusted Guide
              <br />
              to{" "}
              <span className="text-[#c9a84c]">Real Estate</span>
              <br />
              Success
            </h1>
            <p className="mt-6 text-base leading-relaxed text-white/65">
              Expert Insights, step-by-step guides, and smart strategies to help you buy, sell, and invest in properties with confidence.
            </p>

            {/* Feature Pills */}
            <div className="mt-10 flex flex-wrap gap-6">
              {FEATURES.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2.5 text-white/70">
                  <div className="rg-icon-circle flex h-9 w-9 items-center justify-center rounded-full">
                    <Icon className="h-4 w-4 text-[#c9a84c]" />
                  </div>
                  <span className="text-[11px] font-medium leading-tight">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: Login Panel */}
          <motion.div
            className="w-full max-w-[420px] flex-shrink-0"
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0.001 } : { duration: 0.55, delay: 0.15, ease: motionEase.entrance }}
          >
            <LoginPanel />
          </motion.div>
        </div>
      </div>

      {/* ── Guide Cards Section ── */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-8 lg:px-16">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={reduceMotion ? { duration: 0.001 } : { duration: 0.5 }}
          >
            <h2 className="text-2xl font-bold tracking-tight text-[#0d1b3e]">
              Everything You Need in One Place
            </h2>
            <div className="mt-2 h-0.5 w-12 rounded bg-[#c9a84c]" />
          </motion.div>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {GUIDE_CARDS.map((card, i) => (
              <motion.div
                key={card.title}
                initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={reduceMotion ? { duration: 0.001 } : { duration: 0.4, delay: i * 0.08 }}
              >
                <Link
                  href={card.href}
                  className="group rg-guide-card flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-1 hover:border-[#c9a84c]/30 hover:shadow-md"
                >
                  <div className="rg-guide-icon mb-5 flex h-12 w-12 items-center justify-center rounded-xl text-2xl">
                    {card.icon}
                  </div>
                  <h3 className="text-base font-semibold text-[#0d1b3e]">{card.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-500">{card.description}</p>
                  <div className="mt-5 text-[#c9a84c]">
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats / Testimonial Banner ── */}
      <section className="bg-[#0d1b3e] py-16">
        <div className="mx-auto max-w-7xl px-8 lg:px-16">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-16">
            {/* Quote */}
            <div className="max-w-xs">
              <span className="text-5xl font-serif leading-none text-[#c9a84c]/60">"</span>
              <p className="mt-1 text-sm leading-relaxed text-white/75 italic">
                "The Real Estate Guide helped me make smarter decisions and find the perfect property."
              </p>
              <p className="mt-3 text-xs font-medium text-[#c9a84c]">— Sarah Williams, Investor</p>
            </div>

            {/* Stats */}
            <div className="flex flex-1 flex-wrap gap-8 lg:justify-around">
              {STATS.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl font-bold text-white">{stat.value}</div>
                  <div className="mt-1 text-xs text-white/50">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Embedded styles for landing page */}
      <style>{`
        .rg-landing {
          --brand-navy: #0d1b3e;
          --brand-gold: #c9a84c;
          --brand-navy-mid: #142050;
        }
        .rg-btn-gold {
          background: linear-gradient(135deg, #c9a84c, #e2c06e);
          color: #0d1b3e;
          transition: opacity 0.15s, transform 0.15s;
        }
        .rg-btn-gold:hover { opacity: 0.9; transform: translateY(-1px); }
        .rg-icon-circle {
          background: rgba(201, 168, 76, 0.12);
          border: 1px solid rgba(201, 168, 76, 0.25);
        }
        .rg-guide-icon {
          background: linear-gradient(135deg, rgba(13,27,62,0.06), rgba(201,168,76,0.08));
          border: 1px solid rgba(201,168,76,0.15);
        }
        .font-display { font-family: 'Plus Jakarta Sans', 'Inter', ui-sans-serif, system-ui, sans-serif; }
      `}</style>
    </div>
  );
}

/* ── Inline Login Panel ── */
function LoginPanel() {
  const reduceMotion = useAppReducedMotion();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const authenticatedRole = await login(email, password);
      navigate(`/${authenticatedRole}/followup`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rg-login-card rounded-3xl bg-white p-6 sm:p-8 shadow-[0_32px_80px_rgba(0,0,0,0.35)] border border-white/20">
      {/* Logo */}
      <div className="mb-6 flex flex-col items-center gap-2">
        <div className="rg-login-logo-ring flex h-14 w-14 items-center justify-center rounded-2xl overflow-hidden shadow-sm">
          <img src={realestateLogo} alt="RealEstate Guide Logo" className="h-full w-full object-cover" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-[#0d1b3e]">Welcome Back</h2>
          <p className="mt-1 text-xs text-[#64748b]">Login to access your Real Estate Guide</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lp-email" className="rg-label text-xs font-bold tracking-wider text-[#0d1b3e] uppercase">
            Email Address
          </Label>
          <div className="relative">
            <Input
              id="lp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="rg-input h-11 w-full rounded-xl border border-[#cbd5e1] bg-white pl-4 pr-11 text-sm text-[#0d1b3e] placeholder:text-[#94a3b8] focus-visible:border-[#c9a84c] focus-visible:ring-2 focus-visible:ring-[#c9a84c]/20"
              autoComplete="email"
              required
            />
            <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748b]">
              <Mail className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="lp-password" className="rg-label text-xs font-bold tracking-wider text-[#0d1b3e] uppercase">
              Password
            </Label>
            <Link href="/forgot-password" className="text-xs font-semibold text-[#c9a84c] hover:text-[#b89030] transition-colors">
              Forgot Password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="lp-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="rg-input h-11 w-full rounded-xl border border-[#cbd5e1] bg-white pl-4 pr-11 text-sm text-[#0d1b3e] placeholder:text-[#94a3b8] focus-visible:border-[#c9a84c] focus-visible:ring-2 focus-visible:ring-[#c9a84c]/20"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-[#64748b] hover:text-[#0d1b3e] hover:bg-black/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] cursor-pointer"
            >
              {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Remember me */}
        <div className="flex items-center gap-2">
          <input
            id="lp-remember"
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-[#0d1b3e] accent-[#c9a84c] focus:ring-[#c9a84c] cursor-pointer"
          />
          <label htmlFor="lp-remember" className="text-xs font-medium text-[#475569] cursor-pointer">
            Remember me
          </label>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700" role="alert">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={busy}
          className="rg-btn-login mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all duration-150 disabled:opacity-60 cursor-pointer"
        >
          {busy ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Login"
          )}
        </button>

        <p className="text-center text-xs text-[#64748b]">
          Don&apos;t have an account?{" "}
          <Link href="/signup/subadmin" className="font-bold text-[#c9a84c] hover:text-[#b89030] transition-colors">
            Create Account
          </Link>
        </p>
      </form>

      <style>{`
        .rg-login-card {
          font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
          background: #ffffff !important;
          color: #0d1b3e !important;
        }
        .rg-login-logo-ring {
          background: linear-gradient(135deg, rgba(13,27,62,0.06), rgba(201,168,76,0.15));
          border: 1.5px solid rgba(201,168,76,0.35);
        }
        .rg-label {
          color: #0d1b3e !important;
        }
        .rg-input {
          background-color: #ffffff !important;
          border-color: #cbd5e1 !important;
          color: #0d1b3e !important;
          -webkit-text-fill-color: #0d1b3e !important;
        }
        .rg-input::placeholder {
          color: #94a3b8 !important;
          -webkit-text-fill-color: #94a3b8 !important;
          opacity: 1 !important;
        }
        .rg-input:focus {
          border-color: #c9a84c !important;
          box-shadow: 0 0 0 3px rgba(201,168,76,0.18) !important;
        }
        .rg-input:-webkit-autofill,
        .rg-input:-webkit-autofill:hover,
        .rg-input:-webkit-autofill:focus,
        .rg-input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px #ffffff inset !important;
          -webkit-text-fill-color: #0d1b3e !important;
          caret-color: #0d1b3e !important;
          transition: background-color 5000s ease-in-out 0s;
        }
        .rg-btn-login {
          background: linear-gradient(135deg, #0d1b3e 0%, #172d61 100%) !important;
          color: #ffffff !important;
          border: 1px solid rgba(201, 168, 76, 0.4) !important;
          box-shadow: 0 6px 20px rgba(13, 27, 62, 0.25), 0 0 10px rgba(201, 168, 76, 0.12) !important;
        }
        .rg-btn-login:hover:not(:disabled) {
          background: linear-gradient(135deg, #12234e 0%, #1f3b7d 100%) !important;
          border-color: #c9a84c !important;
          box-shadow: 0 8px 24px rgba(13, 27, 62, 0.35), 0 0 16px rgba(201, 168, 76, 0.25) !important;
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}
