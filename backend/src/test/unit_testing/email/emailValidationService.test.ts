import { beforeEach, describe, expect, it, vi } from "vitest";

const { validateMock, createValidatorMock } = vi.hoisted(() => ({
  validateMock: vi.fn(),
  createValidatorMock: vi.fn(),
}));

vi.mock("@mailtester/core", () => ({
  createValidator: createValidatorMock,
}));

import { EmailValidationService } from "../../../shared/email/email-validation.service.js";
import { ValidationError } from "../../../shared/errors/appError.js";

const validResult = {
  valid: true,
  email: "user@example.com",
  score: 50,
  validators: {},
};

function createService() {
  createValidatorMock.mockReturnValue({ validate: validateMock });
  return new EmailValidationService();
}

describe("EmailValidationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createValidatorMock.mockReturnValue({ validate: validateMock });
    validateMock.mockResolvedValue(validResult);
  });

  it("uses Mailtester without enabling MX or SMTP", async () => {
    await createService().validate("user@example.com");

    expect(createValidatorMock).toHaveBeenCalledWith({
      validators: {
        regex: { enabled: true },
        typo: { enabled: true },
        disposable: { enabled: true },
        mx: { enabled: false },
        smtp: { enabled: false },
      },
      earlyExit: true,
      timeout: 5000,
    });
  });

  it("accepts a valid address", async () => {
    validateMock.mockResolvedValue(validResult);

    await expect(createService().validate("user@example.com")).resolves.toEqual(
      validResult,
    );
  });

  it.each([
    "user@gmail.com",
    "user@outlook.com",
    "user@procurement.example.com",
    "user@company.tools",
  ])("accepts legitimate address %s without MX validation", async (email) => {
    validateMock.mockResolvedValue({ ...validResult, email });

    await expect(createService().validate(email)).resolves.toMatchObject({
      valid: true,
      email,
    });
  });

  it("rejects disposable addresses", async () => {
    validateMock.mockResolvedValue({
      ...validResult,
      valid: false,
      reason: "disposable",
      validators: {
        disposable: {
          valid: false,
          validator: "disposable",
          error: { code: "DISPOSABLE_DOMAIN" },
        },
      },
    });

    await expect(createService().validate("user@mailinator.com")).rejects.toThrow(
      "non-disposable",
    );
  });

  it("accepts a custom domain when Mailtester only reports a warning suggestion", async () => {
    validateMock.mockResolvedValue({
      ...validResult,
      email: "user@company.corp",
      validators: {
        typo: {
          valid: false,
          validator: "typo",
          error: {
            code: "TYPO_DETECTED",
            suggestion: "Did you mean user@company.coop?",
            severity: "warning",
          },
        },
      },
    });

    await expect(createService().validate("user@company.corp")).resolves.toBeTruthy();
  });

  it("returns a typo suggestion as a validation error", async () => {
    validateMock.mockResolvedValue({
      ...validResult,
      valid: false,
      reason: "typo",
      validators: {
        typo: {
          valid: false,
          validator: "typo",
          error: {
            code: "TYPO_DETECTED",
            suggestion: "user@gmail.com",
          },
        },
      },
    });

    await expect(createService().validate("user@gmaill.com")).rejects.toThrow(
      "user@gmail.com",
    );
  });

  it("prioritizes an actionable typo over a conflicting disposable result", async () => {
    validateMock.mockResolvedValue({
      ...validResult,
      valid: false,
      validators: {
        typo: {
          valid: false,
          validator: "typo",
          error: {
            code: "TYPO_DETECTED",
            suggestion: "Did you mean user@gmail.com?",
          },
        },
        disposable: {
          valid: false,
          validator: "disposable",
          error: { code: "DISPOSABLE_DOMAIN" },
        },
      },
    });

    await expect(createService().validate("user@gmai.com")).rejects.toThrow(
      "user@gmail.com",
    );
  });

  it("rejects malformed addresses", async () => {
    validateMock.mockResolvedValue({
      ...validResult,
      valid: false,
      reason: "regex",
      validators: {
        regex: {
          valid: false,
          validator: "regex",
          error: { code: "REGEX_INVALID_FORMAT" },
        },
      },
    });

    await expect(createService().validate("invalid-email")).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("does not expose Mailtester runtime errors", async () => {
    validateMock.mockRejectedValue(new Error("internal DNS failure"));

    await expect(createService().validate("user@example.com")).rejects.toThrow(
      "temporarily unavailable",
    );
  });
});
