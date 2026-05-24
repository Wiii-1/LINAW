const { execSync } = require('child_process');
const { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } = require('fs');
const { join } = require('path');
const yaml = require('js-yaml');
const { TENANTS_DIR } = require('../tenantCa/tenantCaOrchestratorService');
const { decryptValue, getEncryptionKey } = require('../tenantCa/encryptionService');
const {
  enrollBootstrapRegistrar,
  registerIdentity,
  enrollIdentityToMsp,
  enrollTlsIdentity,
  normalizeFabricMsp,
  normalizeFabricTls,
  getOrgCaCertPath,
} = require('./tenantFabricCaCli');

const FABRIC_VERSION = process.env.FABRIC_VERSION || '2.5';

function safeSlug(value) {
  return String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 64);
}

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function getCaAdminSecrets(caDeployment) {
  const key = getEncryptionKey();
  return {
    tlsAdminUser: caDeployment.tls_admin_user,
    tlsAdminPassword: decryptValue(caDeployment.tls_admin_password_enc, key),
    orgAdminUser: caDeployment.org_admin_user,
    orgAdminPassword: decryptValue(caDeployment.org_admin_password_enc, key),
  };
}

function relPath(absPath) {
  return absPath.replace(`${TENANTS_DIR}/`, '');
}

function getOrgCryptoRoot(tenantId, orgType) {
  return join(TENANTS_DIR, tenantId, `${orgType}-org`, 'crypto-config');
}

async function provisionPeerCrypto(tenantId, caDeployment, input) {
  const orgSlug = safeSlug(input.organizationName);
  const orgName = orgSlug;
  const peerHost = `peer0.${input.domain}`;
  const adminId = input.adminUser;
  const adminSecret = input.adminPassword;
  const peerId = 'peer0';
  const peerSecret = `${peerId}pw`;
  const peerTlsId = `${peerId}-tls`;

  const admins = getCaAdminSecrets(caDeployment);
  const cryptoRoot = getOrgCryptoRoot(tenantId, 'peer');

  const orgMspDir = join(cryptoRoot, orgName, 'msp');
  const adminMspDir = join(cryptoRoot, orgName, 'users', `Admin@${input.domain}`, 'msp');
  const peerMspDir = join(cryptoRoot, orgName, 'peers', 'peer0', 'msp');
  const peerTlsDir = join(cryptoRoot, orgName, 'peers', 'peer0', 'tls');

  const orgRegistrar = enrollBootstrapRegistrar(
    tenantId,
    caDeployment,
    'org',
    admins.orgAdminUser,
    admins.orgAdminPassword,
  );
  const tlsRegistrar = enrollBootstrapRegistrar(
    tenantId,
    caDeployment,
    'tls',
    admins.tlsAdminUser,
    admins.tlsAdminPassword,
  );

  const affiliation = orgName;

  registerIdentity(tenantId, orgRegistrar, caDeployment, 'org', {
    id: adminId,
    secret: adminSecret,
    type: 'admin',
    affiliation,
  });
  registerIdentity(
    tenantId,
    orgRegistrar,
    caDeployment,
    'org',
    {
      id: peerId,
      secret: peerSecret,
      type: 'peer',
      affiliation,
    },
    { allowAlreadyRegistered: true },
  );

  enrollIdentityToMsp(tenantId, orgRegistrar, caDeployment, 'org', {
    enrollId: adminId,
    enrollSecret: adminSecret,
    mspOutRel: relPath(adminMspDir),
  });
  normalizeFabricMsp(adminMspDir);

  ensureDir(join(orgMspDir, 'signcerts'));
  ensureDir(join(orgMspDir, 'cacerts'));
  copyFileSync(join(adminMspDir, 'signcerts', 'cert.pem'), join(orgMspDir, 'signcerts', 'cert.pem'));
  copyFileSync(
    join(adminMspDir, 'cacerts', 'ca.pem'),
    join(orgMspDir, 'cacerts', 'ca.pem'),
  );

  enrollIdentityToMsp(tenantId, orgRegistrar, caDeployment, 'org', {
    enrollId: peerId,
    enrollSecret: peerSecret,
    mspOutRel: relPath(peerMspDir),
  });
  normalizeFabricMsp(peerMspDir);

  registerIdentity(
    tenantId,
    tlsRegistrar,
    caDeployment,
    'tls',
    {
      id: peerTlsId,
      secret: peerSecret,
      type: 'peer',
      affiliation,
    },
    { allowAlreadyRegistered: true },
  );

  enrollTlsIdentity(tenantId, tlsRegistrar, caDeployment, {
    enrollId: peerTlsId,
    enrollSecret: peerSecret,
    tlsOutRel: relPath(peerTlsDir),
    hosts: peerHost,
  });
  normalizeFabricTls(peerTlsDir);

  return {
    orgName,
    peerHost,
    cryptoRoot,
    peerMspDir,
    peerTlsDir,
    orgMspDir,
  };
}

async function provisionOrdererCrypto(tenantId, caDeployment, input) {
  const orgSlug = safeSlug(input.organizationName);
  const orgName = 'ordererOrg';
  const ordererHost = `orderer.${input.domain}`;
  const adminId = input.adminUser;
  const adminSecret = input.adminPassword;
  const ordererId = 'orderer';
  const ordererSecret = `${ordererId}pw`;
  const ordererTlsId = `${ordererId}-tls`;

  const admins = getCaAdminSecrets(caDeployment);
  const cryptoRoot = getOrgCryptoRoot(tenantId, 'orderer');

  const orgMspDir = join(cryptoRoot, orgName, 'msp');
  const adminMspDir = join(cryptoRoot, orgName, 'users', `Admin@${input.domain}`, 'msp');
  const ordererMspDir = join(cryptoRoot, orgName, 'orderers', 'orderer', 'msp');
  const ordererTlsDir = join(cryptoRoot, orgName, 'orderers', 'orderer', 'tls');

  const orgRegistrar = enrollBootstrapRegistrar(
    tenantId,
    caDeployment,
    'org',
    admins.orgAdminUser,
    admins.orgAdminPassword,
  );
  const tlsRegistrar = enrollBootstrapRegistrar(
    tenantId,
    caDeployment,
    'tls',
    admins.tlsAdminUser,
    admins.tlsAdminPassword,
  );

  const affiliation = orgSlug;

  registerIdentity(tenantId, orgRegistrar, caDeployment, 'org', {
    id: adminId,
    secret: adminSecret,
    type: 'admin',
    affiliation,
  });
  registerIdentity(
    tenantId,
    orgRegistrar,
    caDeployment,
    'org',
    {
      id: ordererId,
      secret: ordererSecret,
      type: 'orderer',
      affiliation,
    },
    { allowAlreadyRegistered: true },
  );

  enrollIdentityToMsp(tenantId, orgRegistrar, caDeployment, 'org', {
    enrollId: adminId,
    enrollSecret: adminSecret,
    mspOutRel: relPath(adminMspDir),
  });
  normalizeFabricMsp(adminMspDir);

  ensureDir(join(orgMspDir, 'signcerts'));
  ensureDir(join(orgMspDir, 'cacerts'));
  copyFileSync(join(adminMspDir, 'signcerts', 'cert.pem'), join(orgMspDir, 'signcerts', 'cert.pem'));
  copyFileSync(
    join(adminMspDir, 'cacerts', 'ca.pem'),
    join(orgMspDir, 'cacerts', 'ca.pem'),
  );

  enrollIdentityToMsp(tenantId, orgRegistrar, caDeployment, 'org', {
    enrollId: ordererId,
    enrollSecret: ordererSecret,
    mspOutRel: relPath(ordererMspDir),
  });
  normalizeFabricMsp(ordererMspDir);

  registerIdentity(
    tenantId,
    tlsRegistrar,
    caDeployment,
    'tls',
    {
      id: ordererTlsId,
      secret: ordererSecret,
      type: 'orderer',
      affiliation,
    },
    { allowAlreadyRegistered: true },
  );

  enrollTlsIdentity(tenantId, tlsRegistrar, caDeployment, {
    enrollId: ordererTlsId,
    enrollSecret: ordererSecret,
    tlsOutRel: relPath(ordererTlsDir),
    hosts: ordererHost,
  });
  normalizeFabricTls(ordererTlsDir);

  return {
    orgName,
    ordererHost,
    cryptoRoot,
    ordererMspDir,
    ordererTlsDir,
    orgMspDir,
    ordererTlsCert: join(ordererTlsDir, 'signcerts', 'cert.pem'),
  };
}

function writeOrdererConfigtx(tenantId, input) {
  const workspace = join(TENANTS_DIR, tenantId, 'orderer-org');
  ensureDir(join(workspace, 'channel-artifacts'));

  const ordererHost = `orderer.${input.domain}`;
  const ordererTlsCertRel = 'crypto-config/ordererOrg/orderers/orderer/tls/signcerts/cert.pem';

  const ordererOrg = {
    Name: 'OrdererOrg',
    ID: input.mspId,
    MSPDir: 'crypto-config/ordererOrg/msp',
    Policies: {
      Readers: { Type: 'Signature', Rule: `OR('${input.mspId}.member')` },
      Writers: { Type: 'Signature', Rule: `OR('${input.mspId}.member')` },
      Admins: { Type: 'Signature', Rule: `OR('${input.mspId}.admin')` },
    },
  };

  const ordererSection = {
    OrdererType: 'etcdraft',
    Addresses: [`${ordererHost}:${input.ordererPort}`],
    BatchTimeout: '2s',
    BatchSize: {
      MaxMessageCount: 10,
      AbsoluteMaxBytes: '99 MB',
      PreferredMaxBytes: '512 KB',
    },
    EtcdRaft: {
      Consenters: [
        {
          Host: ordererHost,
          Port: input.ordererPort,
          ClientTLSCert: ordererTlsCertRel,
          ServerTLSCert: ordererTlsCertRel,
        },
      ],
    },
    Organizations: [ordererOrg],
    Policies: {
      Readers: { Type: 'ImplicitMeta', Rule: 'ANY Readers' },
      Writers: { Type: 'ImplicitMeta', Rule: 'ANY Writers' },
      Admins: { Type: 'ImplicitMeta', Rule: 'MAJORITY Admins' },
      BlockValidation: { Type: 'ImplicitMeta', Rule: 'ANY Writers' },
    },
    Capabilities: { V2_0: true },
  };

  const applicationSection = {
    Organizations: [],
    Capabilities: { V2_0: true },
    Policies: {
      Readers: { Type: 'ImplicitMeta', Rule: 'ANY Readers' },
      Writers: { Type: 'ImplicitMeta', Rule: 'ANY Writers' },
      Admins: { Type: 'ImplicitMeta', Rule: 'MAJORITY Admins' },
      LifecycleEndorsement: { Type: 'ImplicitMeta', Rule: 'MAJORITY Endorsement' },
      Endorsement: { Type: 'ImplicitMeta', Rule: 'MAJORITY Endorsement' },
    },
  };

  const channelSection = {
    Policies: {
      Readers: { Type: 'ImplicitMeta', Rule: 'ANY Readers' },
      Writers: { Type: 'ImplicitMeta', Rule: 'ANY Writers' },
      Admins: { Type: 'ImplicitMeta', Rule: 'MAJORITY Admins' },
    },
    Capabilities: { V2_0: true },
  };

  const configtx = {
    Organizations: [ordererOrg],
    Capabilities: {
      Channel: { V2_0: true },
      Orderer: { V2_0: true },
      Application: { V2_0: true },
    },
    Application: applicationSection,
    Orderer: ordererSection,
    Channel: channelSection,
    Profiles: {
      OrdererGenesis: {
        Policies: channelSection.Policies,
        Capabilities: channelSection.Capabilities,
        Orderer: ordererSection,
        Consortiums: {
          SampleConsortium: {
            Organizations: [],
          },
        },
      },
    },
  };

  writeFileSync(join(workspace, 'configtx.yaml'), yaml.dump(configtx), 'utf8');
  return workspace;
}

function generateGenesisBlock(tenantId) {
  const workspace = join(TENANTS_DIR, tenantId);
  const cmd = [
    'docker run --rm',
    `-v "${workspace}:/workspace"`,
    '--workdir /workspace',
    `hyperledger/fabric-tools:${FABRIC_VERSION}`,
    'bash -lc',
    `'set -euo pipefail && export FABRIC_CFG_PATH=/workspace/orderer-org && mkdir -p /workspace/orderer-org/channel-artifacts && configtxgen -profile OrdererGenesis -channelID system-channel -outputBlock /workspace/orderer-org/channel-artifacts/genesis.block'`,
  ].join(' ');

  execSync(cmd, { stdio: 'inherit' });
  return join(workspace, 'orderer-org', 'channel-artifacts', 'genesis.block');
}

module.exports = {
  provisionPeerCrypto,
  provisionOrdererCrypto,
  writeOrdererConfigtx,
  generateGenesisBlock,
  getOrgCryptoRoot,
  safeSlug,
};
