vi.mock('../../../dao/user/userDao', () => ({
  findByFirebaseUid: vi.fn(),
}));

const userDao = require('../../../dao/user/userDao');
const {
  requireDbUser,
  requireTenantId,
  assertTenantParam,
} = require('../../../middleware/requireTenant');

async function runMiddleware(mw, req = {}) {
  const res = {};
  const next = vi.fn();
  await mw(req, res, next);
  return { next };
}

describe('middleware/requireTenant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requireDbUser returns 404 when the db user is missing', async () => {
    userDao.findByFirebaseUid.mockResolvedValue(null);

    const { next } = await runMiddleware(requireDbUser, { user: { uid: 'fb1' } });
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        code: 'USER_NOT_FOUND',
      }),
    );
    expect(userDao.findByFirebaseUid).toHaveBeenCalledWith('fb1');
  });

  it('requireDbUser passes when userId present', async () => {
    const { next } = await runMiddleware(requireDbUser, {
      user: { userId: 'u1', tenantId: 't1' },
    });
    expect(next).toHaveBeenCalledWith();
    expect(userDao.findByFirebaseUid).not.toHaveBeenCalled();
  });

  it('requireDbUser resolves the db user from firebase uid', async () => {
    userDao.findByFirebaseUid.mockResolvedValue({
      user_id: 'u1',
      tenant_id: 't1',
    });

    const req = { user: { uid: 'fb1' } };
    const { next } = await runMiddleware(requireDbUser, req);

    expect(userDao.findByFirebaseUid).toHaveBeenCalledWith('fb1');
    expect(req.user).toEqual({
      uid: 'fb1',
      userId: 'u1',
      tenantId: 't1',
    });
    expect(next).toHaveBeenCalledWith();
  });

  it('requireTenantId returns 403 when tenantId missing', async () => {
    const { next } = await runMiddleware(requireTenantId, {
      user: { userId: 'u1', tenantId: null },
    });
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        code: 'TENANT_REQUIRED',
      }),
    );
  });

  it('assertTenantParam denies mismatched tenantId', async () => {
    const req = {
      user: { tenantId: 'tenant-a' },
      params: { tenantId: 'tenant-b' },
    };
    const { next } = await runMiddleware(assertTenantParam, req);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        code: 'TENANT_ACCESS_DENIED',
      }),
    );
  });

  it('assertTenantParam passes when tenantId matches', async () => {
    const req = {
      user: { tenantId: 'tenant-a' },
      params: { tenantId: 'tenant-a' },
    };
    const { next } = await runMiddleware(assertTenantParam, req);
    expect(next).toHaveBeenCalledWith();
    expect(next.mock.calls[0][0]).toBeUndefined();
  });
});
