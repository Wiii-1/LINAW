const joi = require('joi');

const dangerousChars = /[;&|`$()\\"'\s:@/]/;

const fabricOrgBaseSchema = joi
  .object({
    organizationName: joi.string().trim().min(1).max(128).required(),
    mspId: joi.string().trim().min(1).max(128).required(),
    domain: joi.string().trim().min(1).max(255).required(),
    adminUser: joi.string().trim().min(1).max(128).required(),
    adminPassword: joi.string().min(1).max(128).required(),
  })
  .required()
  .custom((value, helpers) => {
    const fields = ['organizationName', 'mspId', 'domain', 'adminUser', 'adminPassword'];
    for (const field of fields) {
      if (dangerousChars.test(value[field])) {
        return helpers.error('any.invalid', { message: `${field} contains invalid characters` });
      }
    }
    return value;
  });

function validateFabricOrgRequest(body) {
  const { error, value } = fabricOrgBaseSchema.validate(body ?? {}, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    const message = error.details.map((d) => d.message).join('; ');
    throw new Error(message);
  }
  return value;
}

function validateOrgTypeParam(orgType) {
  if (orgType !== 'peer' && orgType !== 'orderer') {
    throw new Error('orgType must be peer or orderer');
  }
  return orgType;
}

module.exports = {
  validateFabricOrgRequest,
  validateOrgTypeParam,
  fabricOrgBaseSchema,
};
