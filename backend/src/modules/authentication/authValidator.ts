import { z } from "zod";

export const strongPasswordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(128, "Password is too long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/\d/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

// ==========
// Find by Id
// ==========

export const findByIdSchema = z.object({
  id: z.string().uuid("Invalid user Id"),
});

// ==========
// Forgot password validation schema
// ==========

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email("Invalid email")
    .max(255, "Email is too long")
    .trim()
    .toLowerCase(),
});

// ==========
// Reset password validation schema
// ==========

export const resetPasswordSchema = z
  .object({
    resetToken: z
      .string()
      .min(10, "Reset token is required")
      .max(512, "Reset token is too long"),

    password: strongPasswordSchema,

    confirmPassword: z.string(),
  })
  .refine(
    (data: { resetToken: string; password: string; confirmPassword: string }) =>
      data.password === data.confirmPassword,
    {
      message: "Password do not match",
      path: ["confirmPassword"],
    },
  );

// ==========
// Signup validation schema
// ==========

export const signupSchema = z
  .object({
    first_name: z
      .string()
      .min(3, "Must have a minimum of 3 characters")
      .max(40, "First name too long"),

    last_name: z
      .string()
      .min(3, "Last must be 3 characters minimum ")
      .max(40, " Last name is too long"),

    email: z.string().trim().email("Invalid email").toLowerCase(),

    password: strongPasswordSchema,

    confirmPassword: z.string(),

    invitation_token: z
      .string()
      .regex(/^[A-Fa-f0-9]{64}$/)
      .optional(),
  })
  .refine(
    (data: {
      first_name: string;
      last_name: string;
      email: string;
      password: string;
      confirmPassword: string;
    }) => data.password === data.confirmPassword,
    {
      message: "Password do not match",
      path: ["confirmPassword"],
    },
  );

export const verifySignupSchema = z.object({
  verification_id: z.string().uuid("Invalid verification request"),
  email: z.string().trim().email("Invalid email").max(255).toLowerCase(),
  otp: z.string().regex(/^\d{6}$/, "OTP must be six digits"),
});

export const resendSignupSchema = z.object({
  verification_id: z.string().uuid("Invalid verification request"),
  email: z.string().trim().email("Invalid email").max(255).toLowerCase(),
});

// ==========
// Login Validation schema
// ==========

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email").toLowerCase(),

  password: z.string(),
});

// ==========
// Logout Validation Schema
// ==========

export const logoutSchema = z.object({
  session_Id: z.string().uuid("Invalid session Id"),
});

// ==========
// Interface
// ==========

export type signupInput = z.infer<typeof signupSchema>;
export type verifySignupInput = z.infer<typeof verifySignupSchema>;
export type resendSignupInput = z.infer<typeof resendSignupSchema>;

export type loginInput = z.infer<typeof loginSchema>;

export type logoutUser = z.infer<typeof logoutSchema>;

export type findById = z.infer<typeof findByIdSchema>;

export type forgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export type resetPasswordInput = z.infer<typeof resetPasswordSchema>;
