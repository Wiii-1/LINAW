import { describe, expect, it } from "vitest";
import { signupSchema } from "../../../modules/authentication/authValidator.js";

describe("signup email normalization", () => {
  const baseInput = {
    first_name: "Ada",
    last_name: "Lovelace",
    password: "LinawSecure@2026",
    confirmPassword: "LinawSecure@2026",
  };

  it.each([
    "Ada.User@gmail.com",
    "Ada.User@outlook.com",
    "Ada.User@procurement.example.com",
    "Ada.User@company.tools",
  ])("accepts legitimate domain %s", (email) => {
    expect(signupSchema.parse({ ...baseInput, email }).email).toBe(email.toLowerCase());
  });

  it("trims whitespace and normalizes casing", () => {
    expect(
      signupSchema.parse({ ...baseInput, email: "  Ada.User@Example.COM  " }).email,
    ).toBe("ada.user@example.com");
  });

  it("rejects malformed syntax before registration", () => {
    expect(() => signupSchema.parse({ ...baseInput, email: "not-an-email" })).toThrow();
  });

  it("accepts a password meeting every complexity requirement", () => {
    expect(signupSchema.parse({ ...baseInput, email: "user@example.com" })).toMatchObject({
      password: "LinawSecure@2026",
    });
  });

  it.each([
    ["short", "Short@1"],
    ["without uppercase", "linawsecure@2026"],
    ["without lowercase", "LINAWSECURE@2026"],
    ["without number", "LinawSecure@word"],
    ["without special character", "LinawSecure2026"],
  ])("rejects a password %s", (_description, password) => {
    expect(() =>
      signupSchema.parse({
        ...baseInput,
        email: "user@example.com",
        password,
        confirmPassword: password,
      }),
    ).toThrow();
  });
});
