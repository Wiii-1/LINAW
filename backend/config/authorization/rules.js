/**
 * Resource-level policy functions keyed by permission name.
 * Used by middleware/authorize.js when a policy is registered for a permission.
 */
const policies = {
  tenant_scope(user, req) {
    const paramTenantId = req.params?.tenantId;
    if (!paramTenantId) return true;
    return user?.tenantId === paramTenantId;
  },
};

module.exports = policies;
