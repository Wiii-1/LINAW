const joi = require('joi');

const dangerousChars = /[;&|`$()\\"'\s:@/]/;

const tenantProvisionSchema = joi
  .object({
    tenantName: joi.string().trim().min(1).max(128).required(),
    tlsAdminUser: joi.string().trim().min(1).max(128).required(),
    tlsAdminPassword: joi.string().min(1).max(128).required(),
    orgAdminUser: joi.string().trim().min(1).max(128).required(),
    orgAdminPassword: joi.string().min(1).max(128).required(),
  })
  .required()
  .custom((value, helpers) => {
    const fields = [
      'tenantName',
      'tlsAdminUser',
      'tlsAdminPassword',
      'orgAdminUser',
      'orgAdminPassword',
    ];
    for (const field of fields) {
      if (dangerousChars.test(value[field])) {
        return helpers.error('any.invalid', { message: `${field} contains invalid characters` });
      }
    }
    return value;
  });

function validateTenantProvisionRequest(body) {
  const { error, value } = tenantProvisionSchema.validate(body ?? {}, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    const message = error.details.map((d) => d.message).join('; ');
    throw new Error(message);
  }
  return value;
}

module.exports = {
  validateTenantProvisionRequest,
  tenantProvisionSchema,
};
