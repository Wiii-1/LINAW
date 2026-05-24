const {
  requireDbUser,
  requireTenantId,
  assertTenantParam,
} = require('../../../middleware/requireTenant');

function runMiddleware(mw, req = {}) {
  const res = {};
  const next = vi.fn();
  mw(req, res, next);
  return { next };
}

describe('middleware/requireTenant', () => {
  it('requireDbUser returns 404 when userId missing', () => {
    const { next } = runMiddleware(requireDbUser, { user: { uid: 'fb1' } });
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        code: 'USER_NOT_FOUND',
      }),
    );
  });

  it('requireDbUser passes when userId present', () => {
    const { next } = runMiddleware(requireDbUser, {
      user: { userId: 'u1', tenantId: 't1' },
    });
    expect(next).toHaveBeenCalledWith();
  });

  it('requireTenantId returns 403 when tenantId missing', () => {
    const { next } = runMiddleware(requireTenantId, {
      user: { userId: 'u1', tenantId: null },
    });
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        code: 'TENANT_REQUIRED',
      }),
    );
  });

  it('assertTenantParam denies mismatched tenantId', () => {
    const req = {
      user: { tenantId: 'tenant-a' },
      params: { tenantId: 'tenant-b' },
    };
    const { next } = runMiddleware(assertTenantParam, req);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        code: 'TENANT_ACCESS_DENIED',
      }),
    );
  });

  it('assertTenantParam passes when tenantId matches', () => {
    const req = {
      user: { tenantId: 'tenant-a' },
      params: { tenantId: 'tenant-a' },
    };
    const { next } = runMiddleware(assertTenantParam, req);
    expect(next).toHaveBeenCalledWith();
    expect(next.mock.calls[0][0]).toBeUndefined();
  });
});
