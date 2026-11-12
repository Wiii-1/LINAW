import { createValidator, type ValidationResult } from "@mailtester/core";
import { ServiceUnavailableError, ValidationError } from "../errors/appError.js";

export class EmailValidationService {
  private readonly validator = createValidator({
    validators: {
      regex: { enabled: true },
      typo: { enabled: true },
      disposable: { enabled: true },
      mx: { enabled: false },
      smtp: { enabled: false },
    },
    earlyExit: true,
    timeout: 5_000,
  });

  async validate(email: string): Promise<ValidationResult> {
    let result;
    try {
      result = await this.validator.validate(email);
    } catch {
      throw new ServiceUnavailableError(
        "Email validation is temporarily unavailable. Please try again.",
      );
    }

    const typo = result.validators.typo?.error;
    if (!result.valid && typo?.code === "TYPO_DETECTED") {
      const suggestion = typo.suggestion;
      throw new ValidationError(
        suggestion
          ? `Please check your email address. Did you mean ${suggestion}?`
          : "Please check your email address.",
      );
    }

    const failure = result.validators.disposable?.error;
    if (failure?.code === "DISPOSABLE_DOMAIN") {
      throw new ValidationError("Please use a non-disposable email address.");
    }

    if (!result.valid) {
      const regexFailure = result.validators.regex?.error;
      if (regexFailure?.code === "REGEX_INVALID_FORMAT") {
        throw new ValidationError("Invalid email address.");
      }

      throw new ValidationError("Please check your email address.");
    }

    return result;
  }
}
