const AppError = require('../utils/AppError');
const userDao = require("../dao/user/userDao")

async function requireDbUser(req, res, next) {
  try {
    if (req.user?.userId) {
      return next();
    }

    const firebaseUid = req.user?.uid;
    if (!firebaseUid) {
      return next(
        new AppError(
          'User not found in database. Complete signup before using tenant CA APIs.',
          404,
          'USER_NOT_FOUND',
        ),
      );
    }

    const dbUser = await userDao.findByFirebaseUid(firebaseUid);

    if (!dbUser) {
      return next(
        new AppError(
          'User not found in database. Complete signup before using tenant CA APIs.',
          404,
          'USER_NOT_FOUND',
        ),
      );
    }

    req.user = {
      ...req.user,
      userId: dbUser.user_id,
      tenantId: dbUser.tenant_id ?? req.user.tenantId ?? null,
    };

    return next();
  } catch (error) {
    return next(error instanceof AppError ? error : new AppError(error.message || 'Failed to resolve tenant user', 500, 'USER_LOOKUP_FAILED'));
  }
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
