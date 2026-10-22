"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  FileText,
  IndianRupee,
  Loader2,
  MapPin,
  ShieldCheck,
  Upload,
  User2,
} from "lucide-react";

import { estateApi } from "@app/api/estateApi";
import { writeStorage } from "@app/services/storage";
import { tokenStore } from "@app/services/tokenStore";
import { openRazorpayCheckout } from "@app/services/razorpay";
import realestateLogo from "@app/assets/realestateLogo.jpeg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionCard } from "@/components/shell/section-card";
import { RevealSection, motionEase } from "../../../../motion";
import { cn } from "@/lib/utils";

type PlanType = "ALL_LOCATIONS" | "LOCATION_BASED";

type SignupLocation = {
  id?: number | string;
  locationName?: string;
  city?: string;
  state?: string;
  area?: string;
  subscriptionRate?: number | string;
};

type RegistrationInit = {
  registrationToken: string;
  razorpayOrderId: string;
  amountInPaise: number;
  amountInRupees?: number;
  razorpayKeyId: string;
  planType?: string;
};

type RegistrationComplete = {
  token?: string;
  role?: string;
};

const ALL_LOCATION_AMOUNT = 20000;

export default function SubAdminSignupPage() {
  const [planType, setPlanType] = React.useState<PlanType>("ALL_LOCATIONS");
  const [locations, setLocations] = React.useState<SignupLocation[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = React.useState<string[]>([]);
  const [loadingLocations, setLoadingLocations] = React.useState(true);
  const [locationError, setLocationError] = React.useState("");
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    aadhaarNumber: "",
    panNumber: "",
  });
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [aadhaarFile, setAadhaarFile] = React.useState<File | null>(null);
  const [panFile, setPanFile] = React.useState<File | null>(null);
  const [error, setError] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    async function loadLocations() {
      setLoadingLocations(true);
      setLocationError("");
      try {
        const result = await estateApi.locations.list();
        if (!cancelled) {
          setLocations(Array.isArray(result) ? (result as SignupLocation[]) : []);
        }
      } catch (nextError) {
        if (!cancelled) {
          setLocationError(nextError instanceof Error ? nextError.message : "Unable to load locations");
        }
      } finally {
        if (!cancelled) setLoadingLocations(false);
      }
    }
    loadLocations();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedLocations = React.useMemo(
    () => locations.filter((location) => selectedLocationIds.includes(String(location.id))),
    [locations, selectedLocationIds],
  );

  const locationAmount = React.useMemo(
    () => selectedLocations.reduce((sum, location) => sum + locationRate(location), 0),
    [selectedLocations],
  );

  const payableAmount = planType === "ALL_LOCATIONS" ? ALL_LOCATION_AMOUNT : locationAmount;
  const canPay = !busy && payableAmount > 0;

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleLocation(locationId: string) {
    setSelectedLocationIds((current) =>
      current.includes(locationId)
        ? current.filter((id) => id !== locationId)
        : [...current, locationId],
    );
  }

  function validate() {
    if (!form.name.trim()) return "Full name is required";
    if (!form.email.trim()) return "Email address is required";
    if (!form.password) return "Password is required";
    if (form.password.length < 8) return "Password must be at least 8 characters";
    if (form.password !== form.confirmPassword) return "Passwords do not match";
    if (!/^[0-9]{12}$/.test(form.aadhaarNumber.trim())) return "Aadhaar number must be exactly 12 digits";
    if (!/^[A-Z]{3}[PCHFTABGJL][A-Z][0-9]{4}[A-Z]$/.test(form.panNumber.trim().toUpperCase())) return "PAN format is invalid (e.g. ABCDE1234F)";
    if (!aadhaarFile) return "Aadhaar card document upload is required";
    if (!panFile) return "PAN card document upload is required";
    if (planType === "LOCATION_BASED" && selectedLocationIds.length === 0) return "Please select at least one location";
    if (planType === "LOCATION_BASED" && payableAmount <= 0) return "Selected location pricing is not configured";
    return "";
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validate();
    setError(validationError);
    if (validationError) return;

    setBusy(true);
    setStatus("Creating secure payment order...");
    let registrationToken = "";
    try {
      const response = await estateApi.subadminRegistration.initiate({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
        aadhaarNumber: form.aadhaarNumber.trim(),
        panNumber: form.panNumber.trim().toUpperCase(),
        planType,
        locationIds: planType === "LOCATION_BASED" ? selectedLocationIds.map(Number) : [],
      }) as RegistrationInit;

      registrationToken = response.registrationToken;
      setStatus("Uploading KYC documents...");
      await estateApi.kyc.uploadTemp(registrationToken, "AADHAAR_CARD", aadhaarFile!);
      await estateApi.kyc.uploadTemp(registrationToken, "PAN_CARD", panFile!);

      setStatus("Opening Razorpay checkout...");
      await openRazorpayCheckout({
        key: response.razorpayKeyId,
        amount: response.amountInPaise,
        currency: "INR",
        name: "RealEstate-Guide",
        description: planType === "ALL_LOCATIONS" ? "All locations monthly plan" : "Location based monthly plan",
        order_id: response.razorpayOrderId,
        prefill: {
          name: form.name.trim(),
          email: form.email.trim(),
          contact: form.phone.trim(),
        },
        theme: { color: "#16a34a" },
        handler: async (result: unknown) => {
          const payload = result && typeof result === "object" ? result as Record<string, unknown> : {};
          setStatus("Verifying payment on backend...");
          const completed = await estateApi.subadminRegistration.verifyAndComplete({
            registrationToken,
            razorpayPaymentId: payload.razorpay_payment_id,
            razorpayOrderId: payload.razorpay_order_id,
            razorpaySignature: payload.razorpay_signature,
          }) as RegistrationComplete;
          if (completed.token) {
            tokenStore.set(completed.token);
            await writeStorage("authToken", completed.token);
            await writeStorage("activeRole", "subadmin");
          }
          window.location.assign("/subadmin/followup");
        },
        modal: {
          ondismiss: () => {
            setStatus("");
          },
        },
      });
    } catch (nextError) {
      if (registrationToken) {
        await estateApi.subadminRegistration.markFailed({
          registrationToken,
          errorDescription: nextError instanceof Error ? nextError.message : "Payment was not completed",
        }).catch(() => undefined);
      }
      setError(nextError instanceof Error ? nextError.message : "Unable to complete signup");
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="subadmin-signup-page relative min-h-svh bg-[#fbf9f4] text-[#0d1b3e] overflow-x-hidden">
      {/* Decorative top ambient glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-gradient-to-b from-[#e8e0cc]/40 via-[#f5efe0]/20 to-transparent" />

      <div className="relative mx-auto max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Top Header */}
        <header className="flex items-center justify-between py-2">
          <Link href="/" className="flex items-center gap-3 group">
            <img
              src={realestateLogo}
              alt="RealEstate Guide Logo"
              className="h-10 w-10 rounded-xl object-cover shadow-sm ring-1 ring-black/5"
            />
            <div className="leading-tight">
              <div className="text-[15px] font-bold tracking-tight text-[#0d1b3e]">RealEstate</div>
              <div className="text-[9px] font-semibold tracking-[0.22em] text-[#c9a84c] uppercase">— Guide —</div>
            </div>
          </Link>

          <Button asChild variant="outline" size="sm" className="gap-1.5 rounded-full border-[#cbd5e1] bg-white text-[#0d1b3e] hover:bg-[#f1f5f9] hover:text-[#0d1b3e] shadow-xs active:scale-[0.98]">
            <Link href="/login/subadmin">
              <ArrowLeft className="h-3.5 w-3.5 text-[#64748b]" /> Back to sign in
            </Link>
          </Button>
        </header>

        {/* Page Title */}
        <RevealSection
          className="mt-8 mb-7"
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.22, ease: motionEase.entrance }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-[11px] font-bold tracking-[0.16em] text-emerald-800 uppercase">
            <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
            Plan First Signup
          </div>
          <h1 className="mt-3.5 max-w-3xl text-3xl font-bold tracking-tight text-[#0d1b3e] sm:text-4xl lg:text-5xl leading-[1.12]">
            Choose access, add KYC, pay monthly
          </h1>
          <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-[#64748b] sm:text-base">
            Select your preferred subscription tier, provide verification documents, and activate your Sub Admin access securely.
          </p>
        </RevealSection>

        {/* Form Container */}
        <form onSubmit={onSubmit} className="grid grid-flow-dense grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Step 1: Plan Type */}
          <RevealSection transition={{ duration: 0.2, ease: motionEase.entrance }}>
            <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 sm:p-7 shadow-sm">
              <div className="mb-5 border-b border-[#f1f5f9] pb-4">
                <div className="text-[11px] font-bold tracking-wider text-emerald-800 uppercase">Step 1</div>
                <h2 className="mt-1 flex items-center gap-2 text-xl font-bold text-[#0d1b3e]">
                  <MapPin className="h-5 w-5 text-emerald-600" /> Plan Type
                </h2>
                <p className="mt-1 text-xs text-[#64748b]">
                  The backend calculates the final Razorpay amount from the selected plan.
                </p>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2">
                <PlanButton
                  active={planType === "ALL_LOCATIONS"}
                  title="All Locations"
                  price={ALL_LOCATION_AMOUNT}
                  note="Full backend location access across all cities"
                  onClick={() => setPlanType("ALL_LOCATIONS")}
                />
                <PlanButton
                  active={planType === "LOCATION_BASED"}
                  title="Location Based"
                  price={locationAmount}
                  note="Sum of selected individual location rates"
                  onClick={() => setPlanType("LOCATION_BASED")}
                />
              </div>

              {planType === "LOCATION_BASED" && (
                <div className="mt-6 border-t border-[#f1f5f9] pt-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <Label className="text-xs font-bold tracking-wider text-[#334155] uppercase">
                      Select Locations
                    </Label>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      {selectedLocationIds.length} selected
                    </span>
                  </div>

                  {loadingLocations ? (
                    <div className="flex h-32 items-center justify-center rounded-xl border border-[#e2e8f0] bg-[#fafafa] text-sm text-[#64748b]">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-emerald-600" /> Loading locations...
                    </div>
                  ) : locationError ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      {locationError}
                    </div>
                  ) : locations.length === 0 ? (
                    <div className="rounded-xl border border-[#e2e8f0] bg-[#fafafa] p-4 text-center text-sm text-[#64748b]">
                      No locations available currently.
                    </div>
                  ) : (
                    <div className="grid max-h-[340px] grid-cols-1 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2">
                      {locations.map((location) => {
                        const id = String(location.id);
                        const active = selectedLocationIds.includes(id);
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => toggleLocation(id)}
                            className={cn(
                              "rounded-xl border p-3.5 text-left transition-all duration-150 cursor-pointer outline-none",
                              active
                                ? "border-emerald-600 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-600/30"
                                : "border-[#e2e8f0] bg-white hover:border-emerald-300 hover:bg-[#fafafa]"
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-bold text-[#0d1b3e]">
                                  {location.locationName || location.city || "Location"}
                                </div>
                                <div className="mt-1 text-xs text-[#64748b]">
                                  {[location.city, location.area, location.state].filter(Boolean).join(" · ")}
                                </div>
                              </div>
                              <span className="font-mono text-xs font-bold text-emerald-700">
                                {formatInr(locationRate(location))}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </RevealSection>

          {/* Review / Monthly Total */}
          <RevealSection transition={{ duration: 0.2, ease: motionEase.entrance }}>
            <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 sm:p-7 shadow-sm">
              <div className="mb-5 border-b border-[#f1f5f9] pb-4">
                <div className="text-[11px] font-bold tracking-wider text-emerald-800 uppercase">Review</div>
                <h2 className="mt-1 flex items-center gap-2 text-xl font-bold text-[#0d1b3e]">
                  <IndianRupee className="h-5 w-5 text-emerald-600" /> Monthly Total
                </h2>
                <p className="mt-1 text-xs text-[#64748b]">
                  Payment is verified on the backend before account activation.
                </p>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-5">
                <div className="text-xs font-bold tracking-wider text-emerald-800 uppercase">Due Today</div>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="font-mono text-3xl sm:text-4xl font-bold tracking-tight text-[#0d1b3e]">
                    {formatInr(payableAmount)}
                  </span>
                  <span className="text-sm font-semibold text-[#64748b]">/ month</span>
                </div>
                <div className="mt-3 text-xs leading-relaxed text-[#57534e]">
                  {planType === "ALL_LOCATIONS"
                    ? "All backend locations enabled after successful Razorpay verification."
                    : "Location access follows the selected backend location rates."}
                </div>
              </div>

              {status && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                  {status}
                </div>
              )}

              {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700">
                  {error}
                </div>
              )}
            </div>
          </RevealSection>

          {/* Step 2: Account Details */}
          <RevealSection className="lg:col-span-2" transition={{ duration: 0.2, ease: motionEase.entrance }}>
            <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 sm:p-7 shadow-sm">
              <div className="mb-5 border-b border-[#f1f5f9] pb-4">
                <div className="text-[11px] font-bold tracking-wider text-emerald-800 uppercase">Step 2</div>
                <h2 className="mt-1 flex items-center gap-2 text-xl font-bold text-[#0d1b3e]">
                  <User2 className="h-5 w-5 text-emerald-600" /> Account Details
                </h2>
                <p className="mt-1 text-xs text-[#64748b]">
                  These details create the Sub Admin account after successful Razorpay verification.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field id="name" label="Full Name">
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    className="h-11 rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-sm text-[#0d1b3e] placeholder:text-[#94a3b8] focus-visible:border-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-600/20"
                    required
                  />
                </Field>

                <Field id="email" label="Email Address">
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    placeholder="you@company.com"
                    autoComplete="email"
                    className="h-11 rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-sm text-[#0d1b3e] placeholder:text-[#94a3b8] focus-visible:border-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-600/20"
                    required
                  />
                </Field>

                <Field id="phone" label="Phone (Optional)">
                  <Input
                    id="phone"
                    inputMode="tel"
                    value={form.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                    placeholder="+91 9XXXX XXXXX"
                    autoComplete="tel"
                    className="h-11 rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-sm text-[#0d1b3e] placeholder:text-[#94a3b8] focus-visible:border-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-600/20"
                  />
                </Field>

                <div className="hidden md:block" />

                <Field id="password" label="Create Password">
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(event) => updateField("password", event.target.value)}
                      placeholder="Minimum 8 characters"
                      autoComplete="new-password"
                      className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white pl-3.5 pr-11 text-sm text-[#0d1b3e] placeholder:text-[#94a3b8] focus-visible:border-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-600/20"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-[#64748b] hover:text-[#0d1b3e] hover:bg-black/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 cursor-pointer"
                    >
                      {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>

                <Field id="confirm" label="Confirm Password">
                  <div className="relative">
                    <Input
                      id="confirm"
                      type={showConfirmPassword ? "text" : "password"}
                      value={form.confirmPassword}
                      onChange={(event) => updateField("confirmPassword", event.target.value)}
                      placeholder="Re-enter password"
                      autoComplete="new-password"
                      className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white pl-3.5 pr-11 text-sm text-[#0d1b3e] placeholder:text-[#94a3b8] focus-visible:border-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-600/20"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((s) => !s)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-[#64748b] hover:text-[#0d1b3e] hover:bg-black/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 cursor-pointer"
                    >
                      {showConfirmPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>
              </div>
            </div>
          </RevealSection>

          {/* Step 3: KYC Documents */}
          <RevealSection className="lg:col-span-2" transition={{ duration: 0.2, ease: motionEase.entrance }}>
            <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 sm:p-7 shadow-sm">
              <div className="mb-5 border-b border-[#f1f5f9] pb-4">
                <div className="text-[11px] font-bold tracking-wider text-emerald-800 uppercase">Step 3</div>
                <h2 className="mt-1 flex items-center gap-2 text-xl font-bold text-[#0d1b3e]">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" /> KYC Documents
                </h2>
                <p className="mt-1 text-xs text-[#64748b]">
                  Aadhaar and PAN are uploaded before checkout so payment completion can activate the account immediately.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="grid gap-4">
                  <Field id="aadhaar-number" label="Aadhaar Number (12 Digits)">
                    <Input
                      id="aadhaar-number"
                      inputMode="numeric"
                      value={form.aadhaarNumber}
                      onChange={(event) => updateField("aadhaarNumber", event.target.value.replace(/\D/g, "").slice(0, 12))}
                      placeholder="1234 5678 9012"
                      className="h-11 rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-sm text-[#0d1b3e] placeholder:text-[#94a3b8] focus-visible:border-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-600/20"
                      required
                    />
                  </Field>
                  <UploadField id="aadhaar-file" label="Aadhaar Card Document" file={aadhaarFile} onFile={setAadhaarFile} />
                </div>

                <div className="grid gap-4">
                  <Field id="pan-number" label="PAN Number (10 Characters)">
                    <Input
                      id="pan-number"
                      value={form.panNumber}
                      onChange={(event) => updateField("panNumber", event.target.value.toUpperCase().slice(0, 10))}
                      placeholder="ABCDE1234F"
                      className="h-11 rounded-xl border border-[#cbd5e1] bg-white px-3.5 uppercase text-sm text-[#0d1b3e] placeholder:text-[#94a3b8] focus-visible:border-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-600/20"
                      required
                    />
                  </Field>
                  <UploadField id="pan-file" label="PAN Card Document" file={panFile} onFile={setPanFile} />
                </div>
              </div>
            </div>
          </RevealSection>

          {/* Bottom Sticky Action Bar */}
          <RevealSection
            className="sticky bottom-4 z-20 col-span-1 flex flex-col items-center justify-between gap-4 rounded-2xl border border-[#e2e8f0] bg-white/95 p-4 sm:p-5 shadow-xl backdrop-blur-md lg:col-span-2 sm:flex-row"
            transition={{ duration: 0.18, ease: motionEase.entrance }}
          >
            <div className="flex items-center gap-2.5 text-xs font-medium text-[#475569]">
              <FileText className="h-4 w-4 text-emerald-600" />
              <span>Backend verifies amount, KYC documents, and Razorpay signature before activation.</span>
            </div>

            <Button
              type="submit"
              disabled={!canPay}
              className="h-11 min-w-[210px] gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-bold text-white shadow-md transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Pay {formatInr(payableAmount)}
            </Button>
          </RevealSection>
        </form>
      </div>

      <style>{`
        .subadmin-signup-page input:-webkit-autofill,
        .subadmin-signup-page input:-webkit-autofill:hover,
        .subadmin-signup-page input:-webkit-autofill:focus,
        .subadmin-signup-page input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px #ffffff inset !important;
          -webkit-text-fill-color: #0d1b3e !important;
          caret-color: #0d1b3e !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>
    </div>
  );
}

function PlanButton({
  active,
  title,
  price,
  note,
  onClick,
}: {
  active: boolean;
  title: string;
  price: number;
  note: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active ? "true" : undefined}
      className={cn(
        "relative rounded-xl border p-4 sm:p-5 text-left transition-all duration-150 cursor-pointer outline-none",
        active
          ? "border-2 border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-600/30"
          : "border border-[#e2e8f0] bg-[#fafafa] hover:border-emerald-300 hover:bg-white"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-bold text-[#0d1b3e]">{title}</div>
          <div className="mt-1 text-xs text-[#64748b] leading-relaxed">{note}</div>
        </div>
        <div
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full border transition-colors flex-shrink-0 mt-0.5",
            active ? "border-emerald-600 bg-emerald-600 text-white" : "border-[#cbd5e1] bg-white text-transparent"
          )}
        >
          <Check className="h-3.5 w-3.5 stroke-[3]" />
        </div>
      </div>
      <div className="mt-4 font-mono text-xl sm:text-2xl font-bold text-[#0d1b3e]">
        {formatInr(price)}
      </div>
    </button>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs font-bold tracking-wider text-[#334155] uppercase">
        {label}
      </Label>
      {children}
    </div>
  );
}

function UploadField({
  id,
  label,
  file,
  onFile,
}: {
  id: string;
  label: string;
  file: File | null;
  onFile: (file: File | null) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs font-bold tracking-wider text-[#334155] uppercase">
        {label}
      </Label>
      <label
        htmlFor={id}
        className={cn(
          "group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 text-center transition-all duration-150 outline-none",
          file
            ? "border-emerald-500 bg-emerald-50/50"
            : "border-[#cbd5e1] bg-[#f8fafc] hover:border-emerald-400 hover:bg-white"
        )}
      >
        <Upload className={cn("h-5 w-5 transition-transform group-hover:scale-110", file ? "text-emerald-600" : "text-[#64748b]")} />
        <div className="text-sm font-semibold text-[#0d1b3e]">
          {file ? file.name : "Drop file or click to upload"}
        </div>
        <div className="text-xs text-[#64748b]">JPG, PNG, PDF (max 5 MB)</div>
        <input
          id={id}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(event) => onFile(event.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  );
}

function locationRate(location: SignupLocation) {
  const amount = Number(location.subscriptionRate ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function formatInr(amount: number) {
  return `INR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount || 0)}`;
}
