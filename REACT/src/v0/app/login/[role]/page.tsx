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
            <div className="rg-login-card rounded-3xl bg-white dark:bg-[#0c152d]/90 dark:border dark:border-white/10 p-6 sm:p-8 shadow-[0_32px_80px_rgba(0,0,0,0.35)]">
              {/* Logo */}
              <div className="mb-6 flex flex-col items-center gap-2">
                <div className="rg-login-logo-ring flex h-14 w-14 items-center justify-center rounded-2xl overflow-hidden">
                  <img src={realestateLogo} alt="RealEstate Guide Logo" className="h-full w-full object-cover" />
                </div>
                <div className="text-center">
                  <h1 className="text-2xl font-bold tracking-tight text-[#0d1b3e] dark:text-white">Welcome Back</h1>
                  <p className="mt-0.5 text-[12px] text-gray-400 dark:text-gray-300">
                    Login to access your Real Estate Guide
                  </p>
                </div>
              </div>

              {/* Role Badge */}
              <div className="mb-4 sm:mb-5 flex items-center justify-center gap-2 rounded-xl border border-[#c9a84c]/20 bg-[#fdf9f0] dark:bg-white/5 dark:border-white/10 px-4 py-2.5">
                {(() => { const Icon = roleDef.icon; return <Icon className="h-4 w-4 text-[#c9a84c]" />; })()}
                <span className="text-sm font-semibold text-[#0d1b3e] dark:text-white">{roleDef.label}</span>
                <Link href="/roles" className="ml-auto text-[11px] text-[#c9a84c] hover:opacity-75">Change</Link>
              </div>

              <form className="flex flex-col gap-4" onSubmit={onSubmit}>
                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email" className="rg-label text-[11px] font-semibold tracking-wide text-gray-600 uppercase">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Enter your email"
                      className="rg-input h-11 pr-10 text-sm"
                      autoComplete="email"
                      aria-invalid={Boolean(error)}
                    />
                    <Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="rg-label text-[11px] font-semibold tracking-wide text-gray-600 uppercase">
                      Password
                    </Label>
                    <Link href="#" className="text-[11px] font-medium text-[#c9a84c] hover:opacity-80">
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
                      className="rg-input h-11 pr-10 text-sm"
                      autoComplete="current-password"
                      aria-invalid={Boolean(error)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
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
                    className="h-3.5 w-3.5 rounded border-gray-300 accent-[#c9a84c]"
                  />
                  <label htmlFor="remember" className="cursor-pointer text-[12px] text-gray-500 dark:text-gray-300">
                    Remember me
                  </label>
                </div>

                {/* Error */}
                <div className="min-h-5" aria-live="polite">
                  {error ? (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">{error}</p>
                  ) : null}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={busy}
                  className="rg-btn-login flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all duration-150 disabled:opacity-60"
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
                  <p className="text-center text-[12px] text-gray-500 dark:text-gray-400">
                    Don&apos;t have an account?{" "}
                    <Link href="/signup/subadmin" className="font-semibold text-[#c9a84c] hover:opacity-80">
                      Create Account
                    </Link>
                  </p>
                )}
              </form>
            </div>
          </motion.div>
        </div>

        <footer className="relative z-10 text-center text-[11px] text-white/30">
          Protected by enterprise-grade encryption · RealEstate-Guide © 2026
        </footer>
      </div>

      <style>{`
        .rg-login-card { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
        .rg-login-logo-ring {
          background: linear-gradient(135deg, rgba(13,27,62,0.08), rgba(201,168,76,0.15));
          border: 1.5px solid rgba(201,168,76,0.3);
        }
        .rg-label {
          color: rgb(71 85 105) !important;
        }
        .dark .rg-label {
          color: rgba(255, 255, 255, 0.7) !important;
        }
        .rg-input {
          background-color: rgb(248 250 252) !important;
          border-color: rgb(226 232 240) !important;
          color: #0d1b3e !important;
        }
        .rg-input::placeholder {
          color: rgb(148 163 184) !important;
        }
        .dark .rg-input {
          background-color: rgba(255, 255, 255, 0.05) !important;
          border-color: rgba(255, 255, 255, 0.1) !important;
          color: #ffffff !important;
        }
        .dark .rg-input::placeholder {
          color: rgba(255, 255, 255, 0.3) !important;
        }
        .rg-input:focus { border-color: #c9a84c !important; box-shadow: 0 0 0 3px rgba(201,168,76,0.12) !important; }
        .rg-btn-login {
          background: linear-gradient(135deg, #0d1b3e 0%, #1a3066 100%);
          color: white;
          box-shadow: 0 8px 24px rgba(13,27,62,0.3);
        }
        .rg-btn-login:hover:not(:disabled) {
          background: linear-gradient(135deg, #142050 0%, #1e3a75 100%);
          box-shadow: 0 10px 28px rgba(13,27,62,0.4);
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}
