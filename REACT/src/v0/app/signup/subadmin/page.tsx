"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logomark } from "@/components/brand/logo";
import { SectionCard } from "@/components/shell/section-card";
import { RevealSection, motionEase } from "../../../../motion";

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
    if (!form.name.trim()) return "Name is required";
    if (!form.email.trim()) return "Email is required";
    if (!form.password) return "Password is required";
    if (form.password !== form.confirmPassword) return "Passwords do not match";
    if (!/^[0-9]{12}$/.test(form.aadhaarNumber.trim())) return "Aadhaar number must be exactly 12 digits";
    if (!/^[A-Z]{3}[PCHFTABGJL][A-Z][0-9]{4}[A-Z]$/.test(form.panNumber.trim().toUpperCase())) return "PAN format is invalid";
    if (!aadhaarFile) return "Aadhaar card upload is required";
    if (!panFile) return "PAN card upload is required";
    if (planType === "LOCATION_BASED" && selectedLocationIds.length === 0) return "Select at least one location";
    if (planType === "LOCATION_BASED" && payableAmount <= 0) return "Selected location pricing is not configured";
    return "";
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validate();
    setError(validationError);
    if (validationError) return;

    setBusy(true);
    setStatus("Creating secure payment order");
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
      setStatus("Uploading KYC documents");
      await estateApi.kyc.uploadTemp(registrationToken, "AADHAAR_CARD", aadhaarFile!);
      await estateApi.kyc.uploadTemp(registrationToken, "PAN_CARD", panFile!);

      setStatus("Opening Razorpay checkout");
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
        theme: { color: "#22c55e" },
        handler: async (result: unknown) => {
          const payload = result && typeof result === "object" ? result as Record<string, unknown> : {};
          setStatus("Verifying payment");
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
    <div
      className="bg-background relative min-h-svh overflow-hidden"
      style={{
        "--primary": "oklch(0.66 0.17 145)",
        "--primary-foreground": "oklch(0.12 0.03 145)",
        "--ring": "oklch(0.66 0.17 145)",
        "--destructive": "oklch(0.62 0.2 25)",
        "--destructive-foreground": "oklch(0.98 0.01 25)",
      } as React.CSSProperties}
    >
      <div className="bg-spotlight pointer-events-none absolute inset-x-0 top-0 h-[460px] opacity-40" />
      <div className="relative mx-auto max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Logomark className="h-7 w-7" />
            <div className="leading-none">
              <div className="text-sm font-bold tracking-tight">RealEstate</div>
              <div className="text-[9px] font-semibold tracking-[0.2em] text-[#c9a84c] uppercase">— Guide —</div>
            </div>
          </Link>
          <Button asChild variant="secondary" size="sm" className="gap-1.5 active:scale-[0.98]">
            <Link href="/login/subadmin">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </Link>
          </Button>
        </header>

        <RevealSection
          className="mt-10 mb-7"
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.22, ease: motionEase.entrance }}
        >
      <div className="text-foreground inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.18em] uppercase">
            <span className="bg-primary h-1.5 w-1.5 rounded-full" />
            Plan first signup
          </div>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl text-foreground">
            Choose access, add KYC, pay monthly
          </h1>
        </RevealSection>

        <form onSubmit={onSubmit} className="grid grid-flow-dense grid-cols-1 gap-5 lg:grid-cols-[1.08fr_0.92fr]">
          <RevealSection transition={{ duration: 0.2, ease: motionEase.entrance }}>
            <SectionCard
              eyebrow="Step 1"
              title={<span className="flex items-center gap-2"><MapPin className="text-primary h-4 w-4" /> Plan type</span>}
              description="The backend calculates the final Razorpay amount from the selected plan."
            >
    <div className="grid gap-3 sm:grid-cols-2">
                <PlanButton
                  active={planType === "ALL_LOCATIONS"}
                  title="All locations"
                  price={ALL_LOCATION_AMOUNT}
                  note="Full backend location access"
                  onClick={() => setPlanType("ALL_LOCATIONS")}
                />
                <PlanButton
                  active={planType === "LOCATION_BASED"}
                  title="Location based"
                  price={locationAmount}
                  note="Sum of selected location prices"
                  onClick={() => setPlanType("LOCATION_BASED")}
                />
              </div>

              {planType === "LOCATION_BASED" && (
                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <Label className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
                      Locations
                    </Label>
                    <span className="text-muted-foreground text-xs">{selectedLocationIds.length} selected</span>
                  </div>
                  {loadingLocations ? (
                    <div className="border-border bg-muted/25 text-muted-foreground flex h-28 items-center justify-center rounded-lg border text-sm">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading locations
                    </div>
                  ) : locationError ? (
                    <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm">
                      {locationError}
                    </div>
                  ) : (
                    <div className="grid max-h-[340px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                      {locations.map((location) => {
                        const id = String(location.id);
                        const active = selectedLocationIds.includes(id);
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => toggleLocation(id)}
                            className="border-border bg-card/60 hover:border-ring/50 data-[active=true]:border-primary/60 data-[active=true]:bg-primary/10 rounded-lg border p-3 text-left transition-[background-color,border-color,transform] duration-150 active:scale-[0.99]"
                            data-active={active ? "true" : undefined}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold">{location.locationName || location.city || "Location"}</div>
                                <div className="text-muted-foreground mt-1 text-xs">
                                  {[location.city, location.area, location.state].filter(Boolean).join(" · ")}
                                </div>
                              </div>
                              <span className="text-primary font-mono text-xs">{formatInr(locationRate(location))}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </SectionCard>
          </RevealSection>

          <RevealSection transition={{ duration: 0.2, ease: motionEase.entrance }}>
            <SectionCard
              eyebrow="Review"
              title={<span className="flex items-center gap-2"><IndianRupee className="text-primary h-4 w-4" /> Monthly total</span>}
              description="Payment is verified on the backend before account activation."
            >
              <div className="border-border bg-muted/25 rounded-lg border p-5">
                <div className="text-foreground text-[11px] font-medium tracking-[0.18em] uppercase">Due today</div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-mono text-4xl font-semibold tracking-tight">{formatInr(payableAmount)}</span>
                  <span className="text-muted-foreground text-sm">/ month</span>
                </div>
                <div className="text-muted-foreground mt-3 text-xs">
                  {planType === "ALL_LOCATIONS"
                    ? "All backend locations enabled after payment."
                    : "Location access follows the selected backend prices."}
                </div>
              </div>
              {status && (
                <div className="border-primary/25 bg-primary/10 text-primary mt-4 rounded-lg border p-3 text-sm">
                  {status}
                </div>
              )}
              {error && (
                <div className="border-destructive/30 bg-destructive/10 text-destructive mt-4 rounded-lg border p-3 text-sm">
                  {error}
                </div>
              )}
            </SectionCard>
          </RevealSection>

          <RevealSection className="lg:col-span-2" transition={{ duration: 0.2, ease: motionEase.entrance }}>
            <SectionCard
              eyebrow="Step 2"
              title={<span className="flex items-center gap-2"><User2 className="text-primary h-4 w-4" /> Account details</span>}
              description="These details create the Sub Admin account after successful Razorpay verification."
            >
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field id="name" label="Name">
                  <Input id="name" value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Full name" className="h-10" />
                </Field>
                <Field id="email" label="Email">
                  <Input id="email" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="you@company.com" className="h-10" />
                </Field>
                <Field id="phone" label="Phone optional">
                  <Input id="phone" inputMode="tel" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder="+91 9XXXX XXXXX" className="h-10" />
                </Field>
                <div className="hidden md:block" />
                <Field id="password" label="Create password">
                  <Input id="password" type="password" value={form.password} onChange={(event) => updateField("password", event.target.value)} className="h-10" />
                </Field>
                <Field id="confirm" label="Confirm password">
                  <Input id="confirm" type="password" value={form.confirmPassword} onChange={(event) => updateField("confirmPassword", event.target.value)} className="h-10" />
                </Field>
              </div>
            </SectionCard>
          </RevealSection>

          <RevealSection className="lg:col-span-2" transition={{ duration: 0.2, ease: motionEase.entrance }}>
            <SectionCard
              eyebrow="Step 3"
              title={<span className="flex items-center gap-2"><ShieldCheck className="text-primary h-4 w-4" /> KYC documents</span>}
              description="Aadhaar and PAN are uploaded before checkout so payment completion can activate the account immediately."
            >
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="grid gap-3">
                  <Field id="aadhaar-number" label="Aadhaar number">
                    <Input id="aadhaar-number" inputMode="numeric" value={form.aadhaarNumber} onChange={(event) => updateField("aadhaarNumber", event.target.value.replace(/\D/g, "").slice(0, 12))} placeholder="12 digits" className="h-10" />
                  </Field>
                  <UploadField id="aadhaar-file" label="Aadhaar card" file={aadhaarFile} onFile={setAadhaarFile} />
                </div>
                <div className="grid gap-3">
                  <Field id="pan-number" label="PAN number">
                    <Input id="pan-number" value={form.panNumber} onChange={(event) => updateField("panNumber", event.target.value.toUpperCase().slice(0, 10))} placeholder="ABCDE1234F" className="h-10 uppercase" />
                  </Field>
                  <UploadField id="pan-file" label="PAN card" file={panFile} onFile={setPanFile} />
                </div>
              </div>
            </SectionCard>
          </RevealSection>

          <RevealSection
            className="border-border bg-background/85 sticky bottom-4 z-20 col-span-1 flex flex-col items-center justify-between gap-3 rounded-xl border p-4 backdrop-blur-md lg:col-span-2 sm:flex-row"
            transition={{ duration: 0.18, ease: motionEase.entrance }}
          >
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <FileText className="h-3.5 w-3.5" /> Backend verifies amount, documents, and payment signature.
            </div>
            <Button
              type="submit"
              disabled={!canPay}
              className="min-w-[170px] gap-1.5 transition-[opacity,transform] duration-150 active:scale-[0.98]"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
              Pay {formatInr(payableAmount)}
            </Button>
          </RevealSection>
        </form>
      </div>
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
      className="border-border bg-card/60 hover:border-ring/50 data-[active=true]:border-primary/60 data-[active=true]:bg-primary/10 rounded-lg border p-4 text-left transition-[background-color,border-color,transform] duration-150 active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-muted-foreground mt-1 text-xs">{note}</div>
        </div>
        {active && <Check className="text-primary h-4 w-4" />}
      </div>
      <div className="mt-4 font-mono text-lg font-semibold">{formatInr(price)}</div>
    </button>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
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
      <Label htmlFor={id} className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
        {label}
      </Label>
      <label
        htmlFor={id}
        className="group border-border bg-muted/30 hover:border-ring/40 hover:bg-muted/50 focus-within:border-ring/60 focus-within:ring-ring/35 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center outline-none transition-[background-color,border-color,box-shadow,transform] duration-150 focus-within:ring-2 active:scale-[0.99]"
      >
        <Upload className="text-muted-foreground h-4 w-4 transition-transform duration-150 motion-safe:group-hover:scale-105" />
        <div className="text-sm font-medium">{file ? file.name : "Drop file or click to upload"}</div>
        <div className="text-muted-foreground text-[11px]">JPG, PNG, PDF, max 5 MB</div>
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
