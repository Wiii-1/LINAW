import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../../modules/authentication/authPassword.js";

describe("password hashing compatibility", () => {
  it("verifies a legacy password without applying complexity rules", async () => {
    const password = "old-pass";
    const hash = await hashPassword(password);

    await expect(verifyPassword(hash, password)).resolves.toBe(true);
    await expect(verifyPassword(hash, "wrong-pass")).resolves.toBe(false);
  });

  it("verifies a compliant new password with the existing hash format", async () => {
    const password = "LinawSecure@2026";
    const hash = await hashPassword(password);

    expect(hash).toMatch(/^pbkdf2\$sha256\$40000\$/);
    await expect(verifyPassword(hash, password)).resolves.toBe(true);
  });
});
