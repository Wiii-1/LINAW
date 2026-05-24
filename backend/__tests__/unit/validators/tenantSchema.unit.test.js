const { validateTenantProvisionRequest } = require('../../../validators/tenant/tenantSchema');

describe('validators/tenant/tenantSchema', () => {
  const valid = {
    tenantName: 'acme-tenant',
    tlsAdminUser: 'tlsadmin',
    tlsAdminPassword: 'secret1',
    orgAdminUser: 'orgadmin',
    orgAdminPassword: 'secret2',
  };

  it('accepts valid provision payload', () => {
    const result = validateTenantProvisionRequest(valid);
    expect(result.tenantName).toBe('acme-tenant');
  });

  it('rejects dangerous characters in tenantName', () => {
    expect(() =>
      validateTenantProvisionRequest({ ...valid, tenantName: 'bad:name' }),
    ).toThrow();
  });

  it('rejects missing required fields', () => {
    expect(() => validateTenantProvisionRequest({ tenantName: 'only' })).toThrow();
  });
});
