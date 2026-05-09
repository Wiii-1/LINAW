const userDao = require("../../dao/userDao");
const { userSchema } = require("../../validators/user");
const AppError = require("../../utils/AppError");
const disposableService = require("./disposableEmailService");
const logger = require("../../utils/logger");

class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = 400;
    this.details = details;
  }
}

class UserService {
  constructor() {
    this.schemas = userSchema;
  }

  validate(schemaKey, data) {
    const schema = this.schemas[schemaKey];

    if (!schema) {
      throw new Error(`Validation schema not found for key: ${schemaKey}`);
    }

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      throw new ValidationError(
        "Validation failed",
        error.details.map((d) => d.message)
      );
    }

    return value;
  }

  async signup(body, user) {
    const validated = this.validate("signupSchema", { body });
    const { email } = validated.body;

    if (!user?.uid) {
      throw new AppError("User not authenticated", 401, "UNAUTHORIZED");
    }

    let disposableCheck = null;
    try {
      disposableCheck = await disposableService.checkEmail(email);
    } catch (err) {
      logger.warn("Disposable email check failed", {
        message: err?.message || String(err),
      });
    }

    if (disposableCheck?.is_disposable) {
      throw new AppError(
        "Disposable email addresses are not allowed",
        400,
        "DISPOSABLE_EMAIL_NOT_ALLOWED"
      );
    }

    const existingByFirebaseUid = await userDao.findByFirebaseUid(user.uid);
    if (existingByFirebaseUid) {
      return existingByFirebaseUid;
    }

    const existingByEmail = await userDao.findUserByEmail(email);
    if (existingByEmail) {
      throw new AppError("Email already exists", 409, "EMAIL_ALREADY_EXISTS");
    }

    return await userDao.syncAuthenticatedUser({
      email,
      firebase_uid: user.uid,
    });
  }

  async syncAuthenticatedUser(user) {
    if (!user?.uid) {
      throw new AppError("User not authenticated", 401, "UNAUTHORIZED");
    }

    if (!user?.email) {
      throw new AppError("Email is required", 400, "EMAIL_REQUIRED");
    }

    const existingByFirebaseUid = await userDao.findByFirebaseUid(user.uid);
    if (existingByFirebaseUid) {
      return {
        created: false,
        user: existingByFirebaseUid,
      };
    }

    const existingByEmail = await userDao.findUserByEmail(user.email);
    if (existingByEmail) {
      throw new AppError("Email already exists", 409, "EMAIL_ALREADY_EXISTS");
    }

    const createdUser = await userDao.signup({
      email: user.email,
      firebase_uid: user.uid,
    });

    return {
      created: true,
      user: createdUser,
    };
  }

  async login(body, user) {
    const validated = this.validate("loginSchema", { body });
    const { email } = validated.body;

    if (!user?.uid) {
      throw new AppError("User not authenticated", 401, "UNAUTHORIZED");
    }

    const userRow = await userDao.login({
      email,
      firebase_uid: user.uid,
    });

    return userRow;
  }

  async addMember() {}
  async updateMemberRole() {}
  async getOrganizationMemebrs() {}
  async deleteMember() {}
}

module.exports = new UserService();