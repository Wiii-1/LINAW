const { execSync } = require('child_process');
const { existsSync, mkdirSync, readdirSync, copyFileSync } = require('fs');
const { join } = require('path');
const { TENANTS_DIR } = require('../tenantCa/tenantCaOrchestratorService');

const FABRIC_CA_IMAGE = process.env.FABRIC_CA_IMAGE || 'hyperledger/fabric-ca:latest';

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function getNetworkName(tenantId) {
  return `fabric_${tenantId}`;
}

function getOrgCaContainer(tenantId) {
  return `org-ca-${tenantId}`;
}

function getTlsCaContainer(tenantId) {
  return `tls-ca-${tenantId}`;
}

function getOrgCaCertPath(tenantId) {
  return join(TENANTS_DIR, tenantId, 'org-ca', 'ca-cert.pem');
}

function getTlsCaCertPath(tenantId) {
  return join(TENANTS_DIR, tenantId, 'tls-ca', 'ca-cert.pem');
}

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function runFabricCaClient(tenantId, caContainerName, scriptBody) {
  const hostUid = typeof process.getuid === 'function' ? process.getuid() : 0;
  const hostGid = typeof process.getgid === 'function' ? process.getgid() : 0;

  // Use the CA container network namespace so https://localhost:<port> matches
  // the TLS cert SAN (Fabric CA issues certs for localhost, not the container name).
  const cmd = [
    'docker run --rm',
    `-u ${hostUid}:${hostGid}`,
    `--network container:${caContainerName}`,
    `-v ${shellQuote(`${TENANTS_DIR}:/workspace`)}`,
    FABRIC_CA_IMAGE,
    'bash -lc',
    shellQuote(`set -euo pipefail\n${scriptBody}`),
  ].join(' ');

  execSync(cmd, { stdio: 'pipe', maxBuffer: 10 * 1024 * 1024 });
}

function enrollBootstrapRegistrar(tenantId, caDeployment, caType, adminUser, adminPassword) {
  const isOrg = caType === 'org';
  const caHostname = isOrg ? getOrgCaContainer(tenantId) : getTlsCaContainer(tenantId);
  const caPort = isOrg ? caDeployment.org_ca_port : caDeployment.tls_ca_port;
  const caName = isOrg ? caDeployment.org_ca_name : caDeployment.tls_ca_name;
  const tlsCertPath = isOrg ? getOrgCaCertPath(tenantId) : getTlsCaCertPath(tenantId);
  const clientHomeRel = `${tenantId}/fabric-ca-client/${caType}-registrar`;
  const tlsCertContainer = `/workspace/${tenantId}/${isOrg ? 'org-ca' : 'tls-ca'}/ca-cert.pem`;

  ensureDir(join(TENANTS_DIR, clientHomeRel, 'msp'));

  if (!existsSync(tlsCertPath)) {
    throw new Error(`CA certificate not found at ${tlsCertPath}. Is the root CA running?`);
  }

  runFabricCaClient(
    tenantId,
    caHostname,
    [
      `export FABRIC_CA_CLIENT_HOME=${shellQuote(`/workspace/${clientHomeRel}`)}`,
      '&&',
      'fabric-ca-client enroll',
      `-u ${shellQuote(`https://${adminUser}:${adminPassword}@localhost:${caPort}`)}`,
      `--caname ${shellQuote(caName)}`,
      `--tls.certfiles ${shellQuote(tlsCertContainer)}`,
      `-M ${shellQuote(`/workspace/${clientHomeRel}/msp`)}`,
    ].join(' '),
  );

  return clientHomeRel;
}

function registerIdentity(
  tenantId,
  clientHomeRel,
  caDeployment,
  caType,
  { id, secret, type, affiliation },
  options = {},
) {
  const isOrg = caType === 'org';
  const caHostname = isOrg ? getOrgCaContainer(tenantId) : getTlsCaContainer(tenantId);
  const caPort = isOrg ? caDeployment.org_ca_port : caDeployment.tls_ca_port;
  const caName = isOrg ? caDeployment.org_ca_name : caDeployment.tls_ca_name;
  const tlsCertContainer = `/workspace/${tenantId}/${isOrg ? 'org-ca' : 'tls-ca'}/ca-cert.pem`;
  const affArg = '--id.affiliation ""';

  const scriptBody = [
    `export FABRIC_CA_CLIENT_HOME=${shellQuote(`/workspace/${clientHomeRel}`)}`,
    '&&',
    'fabric-ca-client register',
    `--id.name ${shellQuote(id)}`,
    `--id.secret ${shellQuote(secret)}`,
    `--id.type ${shellQuote(type)}`,
    affArg,
    '--id.maxenrollments 0',
    `-u ${shellQuote(`https://localhost:${caPort}`)}`,
    `--caname ${shellQuote(caName)}`,
    `--tls.certfiles ${shellQuote(tlsCertContainer)}`,
  ].join(' ');

  try {
    runFabricCaClient(tenantId, caHostname, scriptBody);
  } catch (error) {
    const output = `${error.stdout || ''}\n${error.stderr || ''}`;
    const alreadyRegistered =
      /Error Code: 74/i.test(output) || /already registered/i.test(output);

    if (alreadyRegistered && options.allowAlreadyRegistered) {
      return;
    }

    if (alreadyRegistered) {
      throw new Error(
        `Identity "${id}" is already registered on the Fabric CA. Use a different admin username than your root CA bootstrap admin.`,
      );
    }

    throw error;
  }
}

function enrollTlsIdentity(
  tenantId,
  clientHomeRel,
  caDeployment,
  { enrollId, enrollSecret, tlsOutRel, hosts },
) {
  const caHostname = getTlsCaContainer(tenantId);
  const caPort = caDeployment.tls_ca_port;
  const caName = caDeployment.tls_ca_name;
  const tlsCertContainer = `/workspace/${tenantId}/tls-ca/ca-cert.pem`;

  ensureDir(join(TENANTS_DIR, tlsOutRel));

  runFabricCaClient(
    tenantId,
    caHostname,
    [
      `export FABRIC_CA_CLIENT_HOME=${shellQuote(`/workspace/${clientHomeRel}`)}`,
      '&&',
      'fabric-ca-client enroll',
      `-u ${shellQuote(`https://${enrollId}:${enrollSecret}@localhost:${caPort}`)}`,
      '--enrollment.profile tls',
      `--csr.hosts ${shellQuote(hosts)}`,
      `--caname ${shellQuote(caName)}`,
      `--tls.certfiles ${shellQuote(tlsCertContainer)}`,
      `-M ${shellQuote(`/workspace/${tlsOutRel}`)}`,
    ].join(' '),
  );
}

function enrollIdentityToMsp(
  tenantId,
  clientHomeRel,
  caDeployment,
  caType,
  { enrollId, enrollSecret, mspOutRel },
) {
  const isOrg = caType === 'org';
  const caHostname = isOrg ? getOrgCaContainer(tenantId) : getTlsCaContainer(tenantId);
  const caPort = isOrg ? caDeployment.org_ca_port : caDeployment.tls_ca_port;
  const caName = isOrg ? caDeployment.org_ca_name : caDeployment.tls_ca_name;
  const tlsCertContainer = `/workspace/${tenantId}/${isOrg ? 'org-ca' : 'tls-ca'}/ca-cert.pem`;

  ensureDir(join(TENANTS_DIR, mspOutRel));

  runFabricCaClient(
    tenantId,
    caHostname,
    [
      `export FABRIC_CA_CLIENT_HOME=${shellQuote(`/workspace/${clientHomeRel}`)}`,
      '&&',
      'fabric-ca-client enroll',
      `-u ${shellQuote(`https://${enrollId}:${enrollSecret}@localhost:${caPort}`)}`,
      `--caname ${shellQuote(caName)}`,
      `--tls.certfiles ${shellQuote(tlsCertContainer)}`,
      `-M ${shellQuote(`/workspace/${mspOutRel}`)}`,
    ].join(' '),
  );
}

function normalizeFabricMsp(mspDir) {
  if (!existsSync(mspDir)) return;
  const keystoreDir = join(mspDir, 'keystore');
  const signcertsDir = join(mspDir, 'signcerts');
  const cacertsDir = join(mspDir, 'cacerts');

  if (existsSync(keystoreDir)) {
    const keys = readdirSync(keystoreDir);
    if (keys.length > 0 && !existsSync(join(keystoreDir, 'key.pem'))) {
      copyFileSync(join(keystoreDir, keys[0]), join(keystoreDir, 'key.pem'));
    }
  }
  if (existsSync(signcertsDir)) {
    const certs = readdirSync(signcertsDir);
    if (certs.length > 0 && !existsSync(join(signcertsDir, 'cert.pem'))) {
      copyFileSync(join(signcertsDir, certs[0]), join(signcertsDir, 'cert.pem'));
    }
  }
  if (existsSync(cacertsDir)) {
    const cas = readdirSync(cacertsDir);
    if (cas.length > 0 && !existsSync(join(cacertsDir, 'ca.pem'))) {
      copyFileSync(join(cacertsDir, cas[0]), join(cacertsDir, 'ca.pem'));
    }
  }
}

function normalizeFabricTls(tlsDir) {
  if (!existsSync(tlsDir)) return;
  const keystoreDir = join(tlsDir, 'keystore');
  const signcertsDir = join(tlsDir, 'signcerts');
  const tlscacertsDir = join(tlsDir, 'tlscacerts');

  if (existsSync(keystoreDir)) {
    const keys = readdirSync(keystoreDir);
    if (keys.length > 0 && !existsSync(join(keystoreDir, 'key.pem'))) {
      copyFileSync(join(keystoreDir, keys[0]), join(keystoreDir, 'key.pem'));
    }
  }
  if (existsSync(signcertsDir)) {
    const certs = readdirSync(signcertsDir);
    if (certs.length > 0 && !existsSync(join(signcertsDir, 'cert.pem'))) {
      copyFileSync(join(signcertsDir, certs[0]), join(signcertsDir, 'cert.pem'));
    }
  }
  if (existsSync(tlscacertsDir)) {
    const cas = readdirSync(tlscacertsDir);
    if (cas.length > 0 && !existsSync(join(tlscacertsDir, 'tls-cert.pem'))) {
      copyFileSync(join(tlscacertsDir, cas[0]), join(tlscacertsDir, 'tls-cert.pem'));
    }
  }
}

module.exports = {
  enrollBootstrapRegistrar,
  registerIdentity,
  enrollIdentityToMsp,
  enrollTlsIdentity,
  normalizeFabricMsp,
  normalizeFabricTls,
  getOrgCaCertPath,
  getTlsCaCertPath,
};
