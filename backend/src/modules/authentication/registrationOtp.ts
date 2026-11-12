import type { AppEnv } from "../../config/env.js";

export const OTP_EXPIRATION_MS = 10 * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

export function generateOtp(): string {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(values[0]! % 1_000_000).padStart(6, "0");
}

export async function hashOtp(
  otp: string,
  registrationId: string,
  email: string,
  env: AppEnv,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.JWT_ACCESS_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${registrationId}:${email}:${otp}`),
  );
  return Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
