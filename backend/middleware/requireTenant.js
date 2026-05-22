const AppError = require('../utils/AppError');

function requireDbUser(req, res, next) {
  if (!req.user?.userId) {
    return next(
      new AppError(
        'User not found in database. Complete signup before using tenant CA APIs.',
        404,
        'USER_NOT_FOUND',
      ),
    );
  }
  return next();
}

function requireTenantId(req, res, next) {
  if (!req.user?.tenantId) {
    return next(
      new AppError(
        'Tenant context is required. Complete signup first.',
        403,
        'TENANT_REQUIRED',
      ),
    );
  }
  return next();
}

function assertTenantParam(req, res, next) {
  const paramTenantId = req.params.tenantId;
  if (!paramTenantId || paramTenantId.length === 0) {
    return next(new AppError('tenantId is required', 400, 'INVALID_TENANT_ID'));
  }
  if (paramTenantId !== req.user.tenantId) {
    return next(
      new AppError(
        'You do not have access to this tenant',
        403,
        'TENANT_ACCESS_DENIED',
      ),
    );
  }
  return next();
}

module.exports = {
  requireDbUser,
  requireTenantId,
  assertTenantParam,
};
