import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAppReducedMotion } from "@app/motion";
import {
  ArrowLeft,
  LoaderCircle,
  Mail,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";

import { Logomark } from "@/components/brand/logo";
import realestateLogo from "@app/assets/realestateLogo.jpeg";
import { ROLE_ORDER, ROLES, type RoleKey } from "@/lib/roles";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@app/auth/AuthContext";
import { motionEase } from "../../../../motion";

export const metadata: Metadata = {
  title: "Sign in — RealEstate-Guide",
};

export default async function LoginPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role: roleParam } = await params;
  if (!ROLE_ORDER.includes(roleParam as RoleKey)) notFound();
  const role = roleParam as RoleKey;

  return <LoginScreen role={role} />;
}

function LoginScreen({ role }: { role: RoleKey }) {
  const roleDef = ROLES[role];
  const reduceMotion = useAppReducedMotion();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const authenticatedRole = await login(email, password, role);
      navigate(`/${authenticatedRole}/followup`, { replace: true });
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Unable to sign in",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rg-login-page relative min-h-svh overflow-y-auto overflow-x-hidden">
      {/* Background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1600&q=80')` }}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-[#0d1b3e]/80" />

      <div className="relative z-10 flex min-h-svh flex-col px-6 py-4 sm:py-8 lg:px-12">
        {/* Header */}
        <motion.header
          className="flex items-center justify-between"
          initial={reduceMotion ? false : { opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0.001 } : { duration: 0.4, ease: motionEase.entrance }}
        >
          <Link href="/" className="flex items-center gap-3">
            <img src={realestateLogo} alt="RealEstate Guide Logo" className="h-9 w-9 rounded-lg object-cover" />
            <div className="leading-none">
              <div className="text-[14px] font-bold tracking-tight text-white">RealEstate</div>
              <div className="text-[9px] font-semibold tracking-[0.22em] text-[#c9a84c] uppercase">— Guide —</div>
            </div>
          </Link>
          <Link
            href="/roles"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium text-white/80 backdrop-blur transition-all hover:bg-white/15 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All Roles
          </Link>
        </motion.header>

        {/* Login Card */}
        <div className="flex flex-1 items-center justify-center py-6 sm:py-12">
          <motion.div
            className="w-full max-w-md"
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0.001 } : { duration: 0.45, ease: motionEase.entrance }}
          >
            <div className="rg-login-card rounded-3xl bg-white p-6 sm:p-8 shadow-[0_32px_80px_rgba(0,0,0,0.35)] border border-white/20">
              {/* Logo */}
              <div className="mb-6 flex flex-col items-center gap-2">
                <div className="rg-login-logo-ring flex h-14 w-14 items-center justify-center rounded-2xl overflow-hidden shadow-sm">
                  <img src={realestateLogo} alt="RealEstate Guide Logo" className="h-full w-full object-cover" />
                </div>
                <div className="text-center">
                  <h1 className="text-2xl font-bold tracking-tight text-[#0d1b3e]">Welcome Back</h1>
                  <p className="mt-1 text-xs text-[#64748b]">
                    Login to access your Real Estate Guide
                  </p>
                </div>
              </div>

              {/* Role Badge */}
              <div className="mb-4 sm:mb-5 flex items-center justify-center gap-2 rounded-xl border border-[#c9a84c]/30 bg-[#fdfaf3] px-4 py-2.5">
                {(() => { const Icon = roleDef.icon; return <Icon className="h-4 w-4 text-[#c9a84c]" />; })()}
                <span className="text-sm font-semibold text-[#0d1b3e]">{roleDef.label}</span>
                <Link href="/roles" className="ml-auto text-xs font-semibold text-[#c9a84c] hover:text-[#b89030]">Change</Link>
              </div>

              <form className="flex flex-col gap-4" onSubmit={onSubmit}>
                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email" className="rg-label text-xs font-bold tracking-wider text-[#0d1b3e] uppercase">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Enter your email"
                      className="rg-input h-11 w-full rounded-xl border border-[#cbd5e1] bg-white pl-4 pr-11 text-sm text-[#0d1b3e] placeholder:text-[#94a3b8] focus-visible:border-[#c9a84c] focus-visible:ring-2 focus-visible:ring-[#c9a84c]/20"
                      autoComplete="email"
                      aria-invalid={Boolean(error)}
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
                    <Label htmlFor="password" className="rg-label text-xs font-bold tracking-wider text-[#0d1b3e] uppercase">
                      Password
                    </Label>
                    <Link href="/forgot-password" className="text-xs font-semibold text-[#c9a84c] hover:text-[#b89030] transition-colors">
                      Forgot Password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                      className="rg-input h-11 w-full rounded-xl border border-[#cbd5e1] bg-white pl-4 pr-11 text-sm text-[#0d1b3e] placeholder:text-[#94a3b8] focus-visible:border-[#c9a84c] focus-visible:ring-2 focus-visible:ring-[#c9a84c]/20"
                      autoComplete="current-password"
                      aria-invalid={Boolean(error)}
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

                {/* Remember */}
                <div className="flex items-center gap-2">
                  <input
                    id="remember"
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#0d1b3e] accent-[#c9a84c] focus:ring-[#c9a84c] cursor-pointer"
                  />
                  <label htmlFor="remember" className="cursor-pointer text-xs font-medium text-[#475569]">
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
                  className="rg-btn-login flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all duration-150 disabled:opacity-60 cursor-pointer"
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

                {role === "subadmin" && (
                  <p className="text-center text-xs text-[#64748b]">
                    Don&apos;t have an account?{" "}
                    <Link href="/signup/subadmin" className="font-bold text-[#c9a84c] hover:text-[#b89030] transition-colors">
                      Create Account
                    </Link>
                  </p>
                )}
              </form>
            </div>
          </motion.div>
        </div>

        <footer className="relative z-10 text-center text-[11px] text-white/40">
          Protected by enterprise-grade encryption · RealEstate-Guide © 2026
        </footer>
      </div>

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
