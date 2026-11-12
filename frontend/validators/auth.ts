import * as z from "zod";

export const passwordRules = {
  minLength: 12,
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /\d/,
  special: /[^A-Za-z0-9]/,
} as const;

export const strongPasswordSchema = z
  .string()
  .min(passwordRules.minLength, "Password must be at least 12 characters.")
  .max(128, "Password must not exceed 128 characters.")
  .regex(passwordRules.uppercase, "Password must contain an uppercase letter.")
  .regex(passwordRules.lowercase, "Password must contain a lowercase letter.")
  .regex(passwordRules.number, "Password must contain a number.")
  .regex(passwordRules.special, "Password must contain a special character.");

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email").min(1).toLowerCase(),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters.")
    .max(128, "Password must not exceed 128 characters."),
});

export const signUpSchema = z
  .object({
    firstName: z.string().min(1, "First name is required."),
    lastName: z.string().min(1, "Last name is required."),
    email: z.string().trim().email("Invalid email").min(1).toLowerCase(),
    password: strongPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Invalid email").min(1).toLowerCase(),
});

export const resetPasswordSchema = z
  .object({
    password: strongPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;

export type SignUpFormValues = z.infer<typeof signUpSchema>;

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
