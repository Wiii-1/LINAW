import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../modules/authentication/authPassword.js", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed-password"),
  verifyPassword: vi.fn(),
}));

import { AuthService } from "../../../modules/authentication/authServices.js";
import { AuthRepository } from "../../../modules/authentication/authRepository.js";
import { ConflictError } from "../../../shared/errors/appError.js";
import type { AppEnv } from "../../../config/env.js";

const repositoryMock = {
  findUserWithCredentialsByEmail: vi.fn(),
  findPendingRegistrationByEmail: vi.fn().mockResolvedValue(null),
  registerUser: vi.fn(),
  createOrUpdatePendingRegistration: vi.fn(),
  findActiveCompanyMemberships: vi.fn().mockResolvedValue([]),
  createSession: vi.fn().mockResolvedValue({}),
};

const notifierMock = {
  sendPasswordResetEmail: vi.fn(),
  sendSignupOtpEmail: vi.fn(),
};

const signupInput = {
  first_name: "Test",
  last_name: "Account",
  email: "test@example.com",
  password: "LinawSecure@2026",
  confirmPassword: "LinawSecure@2026",
};

function createService() {
  return new AuthService(
    repositoryMock as unknown as AuthRepository,
    {
      JWT_ACCESS_SECRET: "access-secret",
      JWT_REFRESH_SECRET: "refresh-secret",
      JWT_ACCESS_EXPIRES: "60m",
      JWT_REFRESH_EXPIRES: "7d",
      } as AppEnv,
      notifierMock,
  );
}

describe("AuthService registration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates the email and persists a pending registration", async () => {
    const result = await createService().register(signupInput);

    expect(repositoryMock.findUserWithCredentialsByEmail).toHaveBeenCalledWith(
      signupInput.email,
    );

    expect(repositoryMock.createOrUpdatePendingRegistration).toHaveBeenCalledWith(
      expect.objectContaining({
        first_name: signupInput.first_name,
        last_name: signupInput.last_name,
        email: signupInput.email,
        password_hash: "hashed-password",
        otp_hash: expect.any(String),
        otp_expires_at: expect.any(Date),
        last_sent_at: expect.any(Date),
      }),
    );
    expect(result.verification_id).toEqual(expect.any(String));
    expect(notifierMock.sendSignupOtpEmail).toHaveBeenCalledWith({
      email: signupInput.email,
      otp: expect.stringMatching(/^\d{6}$/),
    });
  });

  it("rejects an already registered email without persisting", async () => {
    repositoryMock.findUserWithCredentialsByEmail.mockResolvedValue({
      id: "existing-user",
      email: signupInput.email,
    });

    await expect(createService().register(signupInput)).rejects.toBeInstanceOf(
      ConflictError,
    );

    expect(repositoryMock.createOrUpdatePendingRegistration).not.toHaveBeenCalled();
  });

  it("rejects malformed email input on the backend", async () => {
    repositoryMock.findUserWithCredentialsByEmail.mockResolvedValue(null);

    await expect(
      createService().register({ ...signupInput, email: "not-an-email" }),
    ).rejects.toThrow("Invalid email");

    expect(repositoryMock.createOrUpdatePendingRegistration).not.toHaveBeenCalled();
  });

  it("propagates registration persistence failures", async () => {
    const databaseError = new Error("Registration persistence failed");

    repositoryMock.findUserWithCredentialsByEmail.mockResolvedValue(null);
    repositoryMock.createOrUpdatePendingRegistration.mockRejectedValue(databaseError);

    await expect(createService().register(signupInput)).rejects.toBe(
      databaseError,
    );
  });
});
