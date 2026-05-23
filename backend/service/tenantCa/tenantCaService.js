const path = require('path');
const {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} = require('fs');
const db = require('../../db/db');
const tenantCaDao = require('../../dao/tenantCaDao');
const AppError = require('../../utils/AppError');
const { validateTenantProvisionRequest } = require('../../validators/tenant/tenantSchema');
const { encryptValue, getEncryptionKey } = require('./encryptionService');
const { allocateTenantPorts } = require('./tenantPortAllocator');
const { TenantCaOrchestrator, TENANTS_DIR } = require('./tenantCaOrchestratorService');

const orchestrator = new TenantCaOrchestrator();
const COMPOSE_TEMPLATE_PATH = path.join(
  __dirname,
  '..',
  '..',
  'templates',
  'tenant-ca-compose-template.yml',
);

function toApiTenant(row) {
  if (!row) return null;
  return {
    tenantId: row.tenant_id,
    tenantName: row.tenant_name,
    tlsCaName: row.tls_ca_name,
    orgCaName: row.org_ca_name,
    status: row.status,
    createdAt: row.created_at,
    errorMessage: row.error_message || undefined,
    tlsCaPort: row.tls_ca_port ?? undefined,
    orgCaPort: row.org_ca_port ?? undefined,
  };
}

async function updateTenantName(tenantId, tenantName) {
  await db('tenants')
    .where({ tenant_id: tenantId })
    .update({ tenant_name: tenantName, updated_at: db.fn.now() });
}

function persistCertFiles(tenantId, input, certs, ports) {
  const tenantDir = path.join(TENANTS_DIR, tenantId);
  if (!existsSync(tenantDir)) mkdirSync(tenantDir, { recursive: true });

  const tlsDir = path.join(tenantDir, 'tls-ca');
  const orgDir = path.join(tenantDir, 'org-ca');
  if (!existsSync(tlsDir)) mkdirSync(tlsDir, { recursive: true });
  if (!existsSync(orgDir)) mkdirSync(orgDir, { recursive: true });

  writeFileSync(path.join(tlsDir, `tls-ca-${tenantId}.pem`), certs.tlsCertPem, 'utf8');
  writeFileSync(path.join(tlsDir, `tls-ca-${tenantId}-key.pem`), certs.tlsPrivateKey, 'utf8');
  writeFileSync(path.join(orgDir, `org-ca-${tenantId}.pem`), certs.orgCertPem, 'utf8');
  writeFileSync(path.join(orgDir, `org-ca-${tenantId}-key.pem`), certs.orgPrivateKey, 'utf8');
  writeFileSync(
    path.join(tenantDir, 'tenant-metadata.json'),
    JSON.stringify(
      { tenantId, tenantName: input.tenantName, ports, createdAt: new Date().toISOString() },
      null,
      2,
    ),
    'utf8',
  );
}

function readTlsCertFromDisk(tenantId) {
  const certPath = path.join(TENANTS_DIR, tenantId, 'tls-ca', `tls-ca-${tenantId}.pem`);
  if (!existsSync(certPath)) return null;
  return readFileSync(certPath, 'utf8');
}

async function provisionTenantAsync(tenantId, input, plaintextPasswords) {
  orchestrator.init();

  const activeTenantIds = new Set(await tenantCaDao.listAllTenantIds());
  orchestrator.cleanupStaleCaContainers(activeTenantIds);

  try {
    const reservedPorts = await tenantCaDao.listReservedPorts();
    const ports = await allocateTenantPorts(reservedPorts);

    const row = await tenantCaDao.findByTenantId(tenantId);
    const config = {
      tenantId,
      tenantName: input.tenantName,
      tlsCaName: row.tls_ca_name,
      orgCaName: row.org_ca_name,
      tlsAdminUser: plaintextPasswords.tlsAdminUser,
      tlsAdminPassword: plaintextPasswords.tlsAdminPassword,
      orgAdminUser: plaintextPasswords.orgAdminUser,
      orgAdminPassword: plaintextPasswords.orgAdminPassword,
      containerNetworkName: `fabric-${tenantId}`,
      ...ports,
    };

    await orchestrator.startTenantCA(config, COMPOSE_TEMPLATE_PATH);
    const certs = await orchestrator.initializeTenantCAs(config);
    persistCertFiles(tenantId, input, certs, ports);

    await tenantCaDao.updateByTenantId(tenantId, {
      tls_ca_port: ports.tlsCaPort,
      org_ca_port: ports.orgCaPort,
      tls_ca_ops_port: ports.tlsCaOpsPort,
      org_ca_ops_port: ports.orgCaOpsPort,
      status: 'ready',
      error_message: null,
      tls_cert_available: true,
    });

    console.log(`[${tenantId}] Provisioning complete`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${tenantId}] Provisioning failed:`, error);
    await tenantCaDao.updateByTenantId(tenantId, {
      status: 'error',
      error_message: message,
    });
    try {
      await orchestrator.stopTenantCA(tenantId);
    } catch {
      // cleanup best-effort
    }
  }
}

class TenantCaService {
  async listMyTenantCa(user) {
    const rows = await tenantCaDao.listByTenantId(user.tenantId);
    const tenants = rows.map(toApiTenant).filter(Boolean);
    return { tenants, count: tenants.length };
  }

  async createTenantCa(user, body) {
    const input = validateTenantProvisionRequest(body);
    const tenantId = user.tenantId;

    const existing = await tenantCaDao.findByTenantId(tenantId);
    if (existing) {
      throw new AppError(
        'CA already provisioned for your tenant',
        409,
        'TENANT_CA_ALREADY_EXISTS',
      );
    }

    await updateTenantName(tenantId, input.tenantName);

    const encryptionKey = getEncryptionKey();
    const tlsCaName = `tls-ca-${tenantId.substring(0, 8)}`;
    const orgCaName = `org-ca-${tenantId.substring(0, 8)}`;

    await tenantCaDao.create({
      tenant_id: tenantId,
      created_by: user.userId,
      tenant_name: input.tenantName,
      tls_ca_name: tlsCaName,
      org_ca_name: orgCaName,
      tls_admin_user: input.tlsAdminUser,
      tls_admin_password_enc: encryptValue(input.tlsAdminPassword, encryptionKey),
      org_admin_user: input.orgAdminUser,
      org_admin_password_enc: encryptValue(input.orgAdminPassword, encryptionKey),
      status: 'initializing',
    });

    const plaintextPasswords = {
      tlsAdminUser: input.tlsAdminUser,
      tlsAdminPassword: input.tlsAdminPassword,
      orgAdminUser: input.orgAdminUser,
      orgAdminPassword: input.orgAdminPassword,
    };

    provisionTenantAsync(tenantId, input, plaintextPasswords).catch((err) => {
      console.error(`[${tenantId}] Unhandled provisioning error:`, err);
    });

    return {
      tenantId,
      status: 'initializing',
      message: 'Tenant provisioning started',
    };
  }

  async getTenantCa(tenantId) {
    const row = await tenantCaDao.findByTenantId(tenantId);
    if (!row) {
      throw new AppError('Tenant CA deployment not found', 404, 'TENANT_CA_NOT_FOUND');
    }

    const api = toApiTenant(row);
    return {
      ...api,
      tlsCert: row.tls_cert_available ? 'Available' : 'Not available',
    };
  }

  async getTlsCert(tenantId) {
    const row = await tenantCaDao.findByTenantId(tenantId);
    if (!row || !row.tls_cert_available) {
      throw new AppError('TLS certificate not found', 404, 'TLS_CERT_NOT_FOUND');
    }

    const pem = readTlsCertFromDisk(tenantId);
    if (!pem) {
      throw new AppError('TLS certificate not found', 404, 'TLS_CERT_NOT_FOUND');
    }
    return pem;
  }

  async deleteTenantCa(tenantId) {
    const row = await tenantCaDao.findByTenantId(tenantId);
    if (!row) {
      throw new AppError('Tenant CA deployment not found', 404, 'TENANT_CA_NOT_FOUND');
    }

    // Stop containers and remove DB row before deleting tenant files on disk.
    // File removal can restart nodemon in dev and drop the HTTP connection.
    await orchestrator.stopTenantContainers(tenantId);
    await tenantCaDao.deleteByTenantId(tenantId);

    setImmediate(() => {
      orchestrator.removeTenantData(tenantId).catch((err) => {
        console.error(`[${tenantId}] Failed to remove tenant data after delete:`, err);
      });
    });

    return { message: 'Tenant deleted successfully' };
  }
}

module.exports = new TenantCaService();
