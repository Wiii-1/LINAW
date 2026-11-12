"use client";

import { cn } from "cn";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { passwordRules, signUpSchema, type SignUpFormValues } from "@/validators/auth";
import { markAuthTransition, runAuthTransition } from "@/lib/auth-client";
import { useToast } from "@/components/toast-provider";

function getSafeReturnTo() {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("returnTo");
  return value?.startsWith("/invitations/accept?token=") ? value : null;
}

function getInvitationToken() {
  if (typeof window === "undefined") return null;
  const token = new URLSearchParams(window.location.search).get(
    "invitationToken",
  );
  return token && /^[A-Fa-f0-9]{64}$/.test(token) ? token : null;
}

export function SignupForm({ className, ...props }: React.ComponentProps<"div">) {
  const [isLoading, setIsLoading] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const safeReturnTo = getSafeReturnTo();
  const invitationToken = getInvitationToken();
  const form = useForm<SignUpFormValues>({ resolver: zodResolver(signUpSchema), defaultValues: { firstName: "", lastName: "", email: "", password: "", confirmPassword: "" } });
  const passwordValue = form.watch("password", "");
  const passwordChecks = [
    [passwordValue.length >= passwordRules.minLength, "At least 12 characters"],
    [passwordRules.uppercase.test(passwordValue), "One uppercase letter"],
    [passwordRules.lowercase.test(passwordValue), "One lowercase letter"],
    [passwordRules.number.test(passwordValue), "One number"],
    [passwordRules.special.test(passwordValue), "One special character"],
  ] as const;

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = window.setInterval(() => setCooldownSeconds((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [cooldownSeconds]);

  async function onSubmit(values: SignUpFormValues) {
    setIsLoading(true);
    try {
      const { response, data } = await runAuthTransition(async () => {
        const response = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ first_name: values.firstName, last_name: values.lastName, email: values.email, password: values.password, confirmPassword: values.confirmPassword, ...(invitationToken ? { invitation_token: invitationToken } : {}) }) });
        const data = (await response.json()) as { success?: boolean; message?: string; result?: { verification_id?: string; resend_available_at?: string } };
        return { response, data };
      });
      if (!response.ok || data.success !== true) {
        form.setError("root", { message: data.message ?? "Unable to create your account." });
        toastError(data.message ?? "Unable to create your account.");
        return;
      }
      const registrationResult = data.result;
      const nextVerificationId = registrationResult?.verification_id;
      if (!nextVerificationId) {
        form.setError("root", { message: "Invalid verification response." });
        toastError("Invalid verification response.");
        return;
      }
      setVerificationId(nextVerificationId);
      setVerificationEmail(values.email.trim().toLowerCase());
      setCooldownSeconds(Math.max(0, Math.ceil((Date.parse(registrationResult?.resend_available_at ?? "") - Date.now()) / 1000)));
      success("Verification code sent.");
    } catch {
      form.setError("root", { message: "Unable to reach the signup service. Please try again." });
      toastError("Unable to reach the signup service. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function verifyOtp() {
    if (!verificationId) return;
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/signup/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ verification_id: verificationId, email: verificationEmail, otp }) });
      const data = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok || data.success !== true) {
        toastError(data.message ?? "Verification failed.");
        return;
      }
      markAuthTransition();
      success("Account created successfully.");
      router.push(safeReturnTo ?? "/dashboard");
    } catch {
      toastError("Unable to reach the verification service.");
    } finally {
      setIsLoading(false);
    }
  }

  async function resendOtp() {
    if (!verificationId || cooldownSeconds > 0) return;
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/signup/resend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ verification_id: verificationId, email: verificationEmail }) });
      const data = (await response.json()) as { success?: boolean; message?: string; result?: { resend_available_at?: string } };
      if (!response.ok || data.success !== true) {
        toastError(data.message ?? "Unable to resend verification code.");
        return;
      }
      setCooldownSeconds(Math.max(0, Math.ceil((Date.parse(data.result?.resend_available_at ?? "") - Date.now()) / 1000)));
      success("A new verification code was sent.");
    } catch {
      toastError("Unable to reach the verification service.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {verificationId ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 text-center">
            <h1 className="text-xl font-bold">Check your email</h1>
            <FieldDescription>Enter the six-digit code sent to {verificationEmail}.</FieldDescription>
          </div>
          <Field>
            <FieldLabel htmlFor="signup-otp">Verification code</FieldLabel>
            <Input id="signup-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} />
          </Field>
          <Field><Button type="button" disabled={isLoading || otp.length !== 6} onClick={verifyOtp}>Verify email</Button></Field>
          <Field><Button type="button" variant="outline" disabled={isLoading || cooldownSeconds > 0} onClick={resendOtp}>{cooldownSeconds > 0 ? `Resend code in ${cooldownSeconds}s` : "Resend code"}</Button></Field>
        </div>
      ) : <form id="signup-form" onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-xl font-bold">Welcome to LINAW</h1>
            <FieldDescription>Already have an account? <a href={safeReturnTo ? `/login?returnTo=${encodeURIComponent(safeReturnTo)}` : "/login"}>Login</a></FieldDescription>
          </div>
          <Controller name="firstName" control={form.control} render={({ field, fieldState }) => <Field data-invalid={fieldState.invalid}><FieldLabel htmlFor="first-name">First Name</FieldLabel><Input {...field} id="first-name" required className="bg-background" /><FieldError>{fieldState.error?.message}</FieldError></Field>} />
          <Controller name="lastName" control={form.control} render={({ field, fieldState }) => <Field data-invalid={fieldState.invalid}><FieldLabel htmlFor="last-name">Last Name</FieldLabel><Input {...field} id="last-name" required className="bg-background" /><FieldError>{fieldState.error?.message}</FieldError></Field>} />
          <Controller name="email" control={form.control} render={({ field, fieldState }) => <Field data-invalid={fieldState.invalid}><FieldLabel htmlFor="email">Email</FieldLabel><Input {...field} id="email" type="email" required className="bg-background" /><FieldError>{fieldState.error?.message}</FieldError></Field>} />
          <Controller name="password" control={form.control} render={({ field, fieldState }) => <Field data-invalid={fieldState.invalid}><FieldLabel htmlFor="password">Password</FieldLabel><Input {...field} id="password" type="password" autoComplete="new-password" required className="bg-background" /><ul aria-label="Password requirements" className="space-y-1 text-sm text-muted-foreground">{passwordChecks.map(([met, label]) => <li key={label} className={met ? "text-green-700" : undefined}>{met ? "✓" : "○"} {label}</li>)}</ul><FieldError>{fieldState.error?.message}</FieldError></Field>} />
          <Controller name="confirmPassword" control={form.control} render={({ field, fieldState }) => <Field data-invalid={fieldState.invalid}><FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel><Input {...field} id="confirm-password" type="password" required className="bg-background" /><FieldError>{fieldState.error?.message}</FieldError></Field>} />
          <Field><Button type="submit" disabled={isLoading} form="signup-form">Create Account</Button></Field>
          <FieldSeparator>Or</FieldSeparator>
          <Field className="grid gap-4 sm:grid-cols-2">
            <Button variant="outline" type="button">Continue with Apple</Button>
            <Button variant="outline" type="button">Continue with Google</Button>
          </Field>
        </FieldGroup>
      </form>}
      <FieldDescription className="px-6 text-center">By signing up, you agree to our <a href="/terms-of-service">Terms of Service</a> and <a href="/privacy-policy">Privacy Policy</a>.</FieldDescription>
    </div>
  );
}