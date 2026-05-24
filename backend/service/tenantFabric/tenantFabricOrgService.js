const tenantCaDao = require('../../dao/tenantCaDao');
const tenantFabricOrgDao = require('../../dao/tenantFabricOrgDao');
const organizationDao = require('../../dao/organizations/organizationDao');
const AppError = require('../../utils/AppError');
const { validateFabricOrgRequest, validateOrgTypeParam } = require('../../validators/tenant/fabricOrgSchema');
const { encryptValue, getEncryptionKey } = require('../tenantCa/encryptionService');
const {
  allocatePeerPorts,
  allocateOrdererPorts,
} = require('../tenantCa/tenantPortAllocator');
const {
  provisionPeerCrypto,
  provisionOrdererCrypto,
  writeOrdererConfigtx,
  generateGenesisBlock,
  safeSlug,
} = require('./tenantFabricCryptoService');
const {
  addPeerServices,
  addOrdererServices,
  composeUp,
  stopFabricContainers,
  removeServicesFromCompose,
  forceStopFabricContainers,
} = require('./tenantFabricOrchestrator');

function toApiFabricOrg(row) {
  if (!row) return null;
  return {
    fabricOrgId: row.fabric_org_id,
    tenantId: row.tenant_id,
    orgType: row.org_type,
    organizationName: row.organization_name,
    mspId: row.msp_id,
    domain: row.domain,
    peerPort: row.peer_port ?? undefined,
    chaincodePort: row.chaincode_port ?? undefined,
    couchdbPort: row.couchdb_port ?? undefined,
    ordererPort: row.orderer_port ?? undefined,
    ordererAdminPort: row.orderer_admin_port ?? undefined,
    operationsPort: row.operations_port ?? undefined,
    status: row.status,
    errorMessage: row.error_message || undefined,
    createdAt: row.created_at,
  };
}

function toApiCa(row) {
  if (!row) return null;
  return {
    tenantId: row.tenant_id,
    tenantName: row.tenant_name,
    tlsCaName: row.tls_ca_name,
    orgCaName: row.org_ca_name,
    status: row.status,
    createdAt: row.created_at,
    errorMessage: row.error_message || undefined,
  };
}

async function getAllReservedPorts() {
  const caPorts = await tenantCaDao.listReservedPorts();
  const fabricPorts = await tenantFabricOrgDao.listReservedPorts();
  return [...caPorts, ...fabricPorts];
}

const INTERNAL_NODE_IDS = new Set(['peer0', 'peer0-tls', 'orderer', 'orderer-tls']);

function assertFabricOrgAdminIdentity(caDeployment, adminUser) {
  const normalized = String(adminUser || '').trim().toLowerCase();
  const reserved = new Set(
    [
      caDeployment.org_admin_user,
      caDeployment.tls_admin_user,
      ...INTERNAL_NODE_IDS,
    ]
      .map((value) => String(value || '').trim().toLowerCase())
      .filter(Boolean),
  );

  if (reserved.has(normalized)) {
    throw new AppError(
      `Admin username "${adminUser}" is already used by your root CA (org: "${caDeployment.org_admin_user}"). Choose a different peer/orderer admin username, such as peeradmin.`,
      400,
      'FABRIC_ADMIN_ID_RESERVED',
    );
  }
}

class TenantFabricOrgService {
  async getOnboardingStatus(tenantId) {
    const ca = await tenantCaDao.findByTenantId(tenantId);
    const fabricOrgs = await tenantFabricOrgDao.listByTenantId(tenantId);
    const peer = fabricOrgs.find((o) => o.org_type === 'peer') || null;
    const orderer = fabricOrgs.find((o) => o.org_type === 'orderer') || null;

    return {
      rootCa: toApiCa(ca),
      peerOrg: toApiFabricOrg(peer),
      ordererOrg: toApiFabricOrg(orderer),
      canProvisionPeer: ca?.status === 'ready' && !peer,
      canProvisionOrderer: ca?.status === 'ready' && !orderer,
    };
  }

  async provisionPeerOrg(user, body) {
    const input = validateFabricOrgRequest(body);
    const tenantId = user.tenantId;

    const ca = await tenantCaDao.findByTenantId(tenantId);
    if (!ca || ca.status !== 'ready') {
      throw new AppError(
        'Root CA must be ready before provisioning a peer organization',
        400,
        'ROOT_CA_NOT_READY',
      );
    }

    const existing = await tenantFabricOrgDao.findByTenantAndType(tenantId, 'peer');
    if (existing) {
      throw new AppError(
        'Peer organization already provisioned for this tenant',
        409,
        'FABRIC_ORG_ALREADY_EXISTS',
      );
    }

    assertFabricOrgAdminIdentity(ca, input.adminUser);

    const reserved = await getAllReservedPorts();
    const ports = await allocatePeerPorts(reserved);
    const encryptionKey = getEncryptionKey();

    const row = await tenantFabricOrgDao.create({
      tenant_id: tenantId,
      org_type: 'peer',
      organization_name: input.organizationName,
      msp_id: input.mspId,
      domain: input.domain,
      peer_port: ports.peerPort,
      chaincode_port: ports.chaincodePort,
      couchdb_port: ports.couchdbPort,
      operations_port: ports.operationsPort,
      admin_user: input.adminUser,
      admin_password_enc: encryptValue(input.adminPassword, encryptionKey),
      status: 'initializing',
    });

    const plaintextPassword = input.adminPassword;
    provisionPeerAsync(tenantId, row.fabric_org_id, ca, input, ports, plaintextPassword).catch(
      (err) => {
        console.error(`[${tenantId}] Unhandled peer provisioning error:`, err);
      },
    );

    return {
      fabricOrgId: row.fabric_org_id,
      orgType: 'peer',
      status: 'initializing',
      message: 'Peer organization provisioning started',
    };
  }

  async provisionOrdererOrg(user, body) {
    const input = validateFabricOrgRequest(body);
    const tenantId = user.tenantId;

    const ca = await tenantCaDao.findByTenantId(tenantId);
    if (!ca || ca.status !== 'ready') {
      throw new AppError(
        'Root CA must be ready before provisioning an orderer organization',
        400,
        'ROOT_CA_NOT_READY',
      );
    }

    const existing = await tenantFabricOrgDao.findByTenantAndType(tenantId, 'orderer');
    if (existing) {
      throw new AppError(
        'Orderer organization already provisioned for this tenant',
        409,
        'FABRIC_ORG_ALREADY_EXISTS',
      );
    }

    assertFabricOrgAdminIdentity(ca, input.adminUser);

    const reserved = await getAllReservedPorts();
    const ports = await allocateOrdererPorts(reserved);
    const encryptionKey = getEncryptionKey();

    const row = await tenantFabricOrgDao.create({
      tenant_id: tenantId,
      org_type: 'orderer',
      organization_name: input.organizationName,
      msp_id: input.mspId,
      domain: input.domain,
      orderer_port: ports.ordererPort,
      orderer_admin_port: ports.ordererAdminPort,
      operations_port: ports.operationsPort,
      admin_user: input.adminUser,
      admin_password_enc: encryptValue(input.adminPassword, encryptionKey),
      status: 'initializing',
    });

    const plaintextPassword = input.adminPassword;
    provisionOrdererAsync(tenantId, row.fabric_org_id, ca, input, ports, plaintextPassword).catch(
      (err) => {
        console.error(`[${tenantId}] Unhandled orderer provisioning error:`, err);
      },
    );

    return {
      fabricOrgId: row.fabric_org_id,
      orgType: 'orderer',
      status: 'initializing',
      message: 'Orderer organization provisioning started',
    };
  }

  async deleteFabricOrg(tenantId, orgTypeRaw) {
    const orgType = validateOrgTypeParam(orgTypeRaw);
    const row = await tenantFabricOrgDao.findByTenantAndType(tenantId, orgType);
    if (!row) {
      throw new AppError('Fabric organization not found', 404, 'FABRIC_ORG_NOT_FOUND');
    }

    if (orgType === 'peer') {
      const orgSlug = safeSlug(row.organization_name);
      removeServicesFromCompose(tenantId, [
        `peer0-${orgSlug}-${tenantId}`,
        `couchdb-${orgSlug}-${tenantId}`,
      ]);
    } else {
      removeServicesFromCompose(tenantId, [`orderer-${tenantId}`]);
    }

    await tenantFabricOrgDao.deleteByTenantAndType(tenantId, orgType);

    return { message: `${orgType} organization removed` };
  }

  async cleanupAllForTenant(tenantId) {
    stopFabricContainers(tenantId);
    forceStopFabricContainers(tenantId);
    await tenantFabricOrgDao.deleteByTenantId(tenantId);
  }
}

async function provisionPeerAsync(tenantId, fabricOrgId, ca, input, ports, adminPassword) {
  try {
    const cryptoInput = { ...input, adminPassword };
    const crypto = await provisionPeerCrypto(tenantId, ca, cryptoInput);

    addPeerServices(tenantId, {
      orgName: crypto.orgName,
      domain: input.domain,
      mspId: input.mspId,
      peerPort: ports.peerPort,
      chaincodePort: ports.chaincodePort,
      couchdbPort: ports.couchdbPort,
      operationsPort: ports.operationsPort,
    });

    const peerContainer = `peer0-${crypto.orgName}-${tenantId}`;
    const couchContainer = `couchdb-${crypto.orgName}-${tenantId}`;
    composeUp(tenantId, [couchContainer, peerContainer]);

    await organizationDao.upsertOrganization({
      tenant_id: tenantId,
      organization_name: input.organizationName,
      msp_id: input.mspId,
    });

    await tenantFabricOrgDao.updateById(fabricOrgId, {
      status: 'ready',
      error_message: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await tenantFabricOrgDao.updateById(fabricOrgId, {
      status: 'error',
      error_message: message,
    });
    forceStopFabricContainers(tenantId);
  }
}

async function provisionOrdererAsync(tenantId, fabricOrgId, ca, input, ports, adminPassword) {
  try {
    const cryptoInput = { ...input, adminPassword };
    await provisionOrdererCrypto(tenantId, ca, cryptoInput);

    writeOrdererConfigtx(tenantId, {
      mspId: input.mspId,
      domain: input.domain,
      ordererPort: ports.ordererPort,
    });

    generateGenesisBlock(tenantId);

    addOrdererServices(tenantId, {
      domain: input.domain,
      mspId: input.mspId,
      ordererPort: ports.ordererPort,
      ordererAdminPort: ports.ordererAdminPort,
      operationsPort: ports.operationsPort,
    });

    const ordererContainer = `orderer-${tenantId}`;
    composeUp(tenantId, [ordererContainer]);

    await tenantFabricOrgDao.updateById(fabricOrgId, {
      status: 'ready',
      error_message: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await tenantFabricOrgDao.updateById(fabricOrgId, {
      status: 'error',
      error_message: message,
    });
    forceStopFabricContainers(tenantId);
  }
}

module.exports = new TenantFabricOrgService();
