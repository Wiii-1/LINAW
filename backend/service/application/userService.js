const userDao = require("../../dao/userDao");
const { userSchema } = require("../../validators/user");
const AppError = require("../../utils/AppError");
const disposableService = require("./disposableEmailService");
const logger = require("../../utils/logger");
const db = require("../../db/db");

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

  async createDefaultTenant(user_email) {
    const baseName = (user_email || 'tenant').split('@')[0];
    const tenantName = `${baseName}-tenant`;

    const [tenant] = await db('tenants')
      .insert({ tenant_name: tenantName })
      .returning(['tenant_id']);

    return tenant.tenant_id;
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
        error.details.map((d) => ({
          field: (d.context && (d.context.label || (d.path && d.path[0]))) || null,
          message: d.message,
        }))
      );
    }

    return value;
  }

  async signup({ email, firebase_uid, tenant_id = null }) {
    // Validate email
    this.validate("signupSchema", { body: { email } });

    // Check disposable email
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

    // Check if user already exists
    const existingByFirebaseUid = await userDao.findByFirebaseUid(firebase_uid);
    if (existingByFirebaseUid) {
      throw new AppError(
        "User already exists. Please login.",
        409,
        "USER_ALREADY_EXISTS"
      );
    }

    const existingByEmail = await userDao.findUserByEmail(email);
    if (existingByEmail) {
      throw new AppError(
        "Email already exists",
        409,
        "EMAIL_ALREADY_EXISTS"
      );
    }

    // Create default tenant if not provided
    let assignedTenantId = tenant_id;
    if (!assignedTenantId) {
      assignedTenantId = await this.createDefaultTenant(email);
    }

    // Create user
    const user = await userDao.signup({
      email,
      firebase_uid,
      tenant_id: assignedTenantId,
    });

    logger.info('User signed up successfully', { 
      user_id: user.user_id, 
      email 
    });

    return user;
  }

  async login({ email, firebase_uid }) {
    // Validate email format
    this.validate("loginSchema", { body: { email } });

    // Find user by firebase_uid
    const user = await userDao.findByFirebaseUid(firebase_uid);

    if (!user) {
      throw new AppError(
        "User not found. Please sign up first.",
        404,
        "USER_NOT_FOUND"
      );
    }

    // Update last login timestamp
    await db('users')
      .where({ user_id: user.user_id })

    logger.info('User logged in', { 
      user_id: user.user_id, 
      email 
    });

    return user;
  }
}

module.exports = new UserService();