const { execSync } = require('child_process');
const {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} = require('fs');
const { basename, join } = require('path');
const forge = require('node-forge');
const { FabricCaApiClient } = require('./fabricCaApiClient');

const BACKEND_ROOT = join(__dirname, '..', '..');
const TENANTS_DIR = process.env.TENANTS_DIR || join(BACKEND_ROOT, 'tenants');
const COMPOSE_CMD = process.env.COMPOSE_CMD || 'docker compose';

class TenantCaOrchestrator {
  init() {
    if (!existsSync(TENANTS_DIR)) {
      mkdirSync(TENANTS_DIR, { recursive: true });
    }
  }

  generateComposeFile(config, templatePath) {
    let template = readFileSync(templatePath, 'utf-8');

    template = template.replace(/{TENANT_ID}/g, config.tenantId);
    template = template.replace(/{TENANT_NAME}/g, config.tenantName);
    template = template.replace(/{TLS_CA_NAME}/g, config.tlsCaName);
    template = template.replace(/{ORG_CA_NAME}/g, config.orgCaName);
    template = template.replace(/{TLS_CA_PORT}/g, String(config.tlsCaPort));
    template = template.replace(/{ORG_CA_PORT}/g, String(config.orgCaPort));
    template = template.replace(/{TLS_CA_OPS_PORT}/g, String(config.tlsCaOpsPort));
    template = template.replace(/{ORG_CA_OPS_PORT}/g, String(config.orgCaOpsPort));
    template = template.replace(/{TLS_ADMIN_USER}/g, config.tlsAdminUser);
    template = template.replace(/{TLS_ADMIN_PASSWORD}/g, config.tlsAdminPassword);
    template = template.replace(/{ORG_ADMIN_USER}/g, config.orgAdminUser);
    template = template.replace(/{ORG_ADMIN_PASSWORD}/g, config.orgAdminPassword);
    const hostUid = process.getuid?.() ?? 0;
    const hostGid = process.getgid?.() ?? 0;
    template = template.replace(/{HOST_UID}/g, String(hostUid));
    template = template.replace(/{HOST_GID}/g, String(hostGid));

    const composePath = join(TENANTS_DIR, `compose-${config.tenantId}.yml`);
    writeFileSync(composePath, template);
    return composePath;
  }

  async startTenantCA(config, templatePath) {
    try {
      const composePath = this.generateComposeFile(config, templatePath);
      const tenantDir = join(TENANTS_DIR, config.tenantId);
      const tlsDir = join(tenantDir, 'tls-ca');
      const orgDir = join(tenantDir, 'org-ca');
      const orgClientDir = join(tenantDir, 'org-ca-client');

      if (!existsSync(tenantDir)) mkdirSync(tenantDir, { recursive: true });
      if (!existsSync(tlsDir)) mkdirSync(tlsDir, { recursive: true });
      if (!existsSync(orgDir)) mkdirSync(orgDir, { recursive: true });
      if (!existsSync(orgClientDir)) mkdirSync(orgClientDir, { recursive: true });

      const cmd = `${COMPOSE_CMD} -f ${composePath} up -d`;
      console.log(`[${config.tenantId}] Starting containers: ${cmd}`);
      execSync(cmd, { cwd: TENANTS_DIR, stdio: 'inherit' });

      await this.waitForCAHealthy(config.tlsCaPort, 30);
      await this.waitForCAHealthy(config.orgCaPort, 30);
      console.log(`[${config.tenantId}] Containers started and healthy`);
    } catch (error) {
      try {
        await this.stopTenantCA(config.tenantId);
      } catch (cleanupError) {
        console.error(`[${config.tenantId}] Rollback after failed start:`, cleanupError);
      }
      throw new Error(
        `Failed to start tenant CA: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async waitForCAHealthy(port, maxRetries) {
    let retries = 0;
    while (retries < maxRetries) {
      try {
        const client = new FabricCaApiClient(`localhost:${port}`);
        await client.getCAInfo();
        return;
      } catch {
        retries += 1;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    throw new Error(`CA on port ${port} did not become healthy after ${maxRetries}s`);
  }

  async initializeTenantCAs(config) {
    const tlsClient = new FabricCaApiClient(`localhost:${config.tlsCaPort}`);
    const orgClient = new FabricCaApiClient(`localhost:${config.orgCaPort}`);
    const tlsIdentity = this.generateEnrollmentCSR(config.tlsAdminUser);
    const orgIdentity = this.generateEnrollmentCSR(config.orgAdminUser);

    console.log(`[${config.tenantId}] Enrolling TLS CA admin...`);
    const tlsEnrollRes = await tlsClient.enroll(
      config.tlsAdminUser,
      config.tlsAdminPassword,
      tlsIdentity.csrPem,
      config.tlsCaName,
    );

    if (!tlsEnrollRes.success || !tlsEnrollRes.result?.Cert) {
      throw new Error(`TLS CA enroll failed: ${JSON.stringify(tlsEnrollRes.errors)}`);
    }

    const tlsCertPem = Buffer.from(tlsEnrollRes.result.Cert, 'base64').toString('utf-8');

    console.log(`[${config.tenantId}] Enrolling Org CA admin...`);
    const orgEnrollRes = await orgClient.enroll(
      config.orgAdminUser,
      config.orgAdminPassword,
      orgIdentity.csrPem,
      config.orgCaName,
    );

    if (!orgEnrollRes.success || !orgEnrollRes.result?.Cert) {
      throw new Error(`Org CA enroll failed: ${JSON.stringify(orgEnrollRes.errors)}`);
    }

    const orgCertPem = Buffer.from(orgEnrollRes.result.Cert, 'base64').toString('utf-8');

    return {
      tlsCertPem,
      orgCertPem,
      tlsPrivateKey: tlsIdentity.privateKeyPem,
      orgPrivateKey: orgIdentity.privateKeyPem,
    };
  }

  async stopTenantCA(tenantId) {
    const composePath = join(TENANTS_DIR, `compose-${tenantId}.yml`);

    if (existsSync(composePath)) {
      const cmd = `${COMPOSE_CMD} -f ${composePath} down -v`;
      console.log(`[${tenantId}] Stopping containers: ${cmd}`);
      execSync(cmd, { cwd: TENANTS_DIR, stdio: 'inherit' });
      rmSync(composePath);
    }

    this.forceStopTenantContainers(tenantId);
    this.removeTenantDirectory(tenantId);
    console.log(`[${tenantId}] Containers stopped and cleaned up`);
  }

  forceStopTenantContainers(tenantId) {
    const safeTenantId = basename(tenantId);
    if (safeTenantId !== tenantId || tenantId.includes('..')) return;

    for (const containerName of [`tls-ca-${safeTenantId}`, `org-ca-${safeTenantId}`]) {
      try {
        execSync(`docker rm -f ${containerName}`, { stdio: 'ignore' });
      } catch {
        // Container may not exist
      }
    }
  }

  cleanupStaleCaContainers(activeTenantIds) {
    try {
      const output = execSync(
        'docker ps -aq --filter "label=service=hyperledger-fabric"',
        { encoding: 'utf-8' },
      );
      const containerIds = output
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      for (const containerId of containerIds) {
        let tenantLabel = '';
        try {
          tenantLabel = execSync(
            `docker inspect -f '{{index .Config.Labels "tenant"}}' ${containerId}`,
            { encoding: 'utf-8' },
          ).trim();
        } catch {
          continue;
        }

        if (!tenantLabel || activeTenantIds.has(tenantLabel)) continue;

        console.log(`[cleanup] Removing stale CA container ${containerId} (tenant=${tenantLabel})`);
        try {
          execSync(`docker rm -f ${containerId}`, { stdio: 'inherit' });
        } catch (error) {
          console.error(`[cleanup] Failed to remove container ${containerId}:`, error);
        }
      }
    } catch (error) {
      console.error('[cleanup] Failed to list stale CA containers:', error);
    }
  }

  removeTenantDirectory(tenantId) {
    const safeTenantId = basename(tenantId);
    if (safeTenantId !== tenantId || tenantId.includes('..')) {
      throw new Error(`Invalid tenant id: ${tenantId}`);
    }

    const tenantDir = join(TENANTS_DIR, safeTenantId);
    if (!existsSync(tenantDir)) return;

    try {
      rmSync(tenantDir, { recursive: true, force: true });
      return;
    } catch (error) {
      if (error.code !== 'EACCES' && error.code !== 'EPERM') throw error;
    }

    console.log(`[${tenantId}] Removing root-owned tenant directory via Docker...`);
    const cmd = `docker run --rm -v "${TENANTS_DIR}:/tenants:rw" alpine rm -rf "/tenants/${safeTenantId}"`;
    execSync(cmd, { stdio: 'inherit' });

    if (existsSync(tenantDir)) {
      throw new Error(`Could not remove tenant data; root-owned files remain at ${tenantDir}`);
    }
  }

  generateEnrollmentCSR(commonName) {
    const keys = forge.pki.rsa.generateKeyPair(2048);
    const csr = forge.pki.createCertificationRequest();
    csr.publicKey = keys.publicKey;
    csr.setSubject([{ name: 'commonName', value: commonName }]);
    csr.sign(keys.privateKey, forge.md.sha256.create());

    if (!csr.verify()) {
      throw new Error(`Generated CSR verification failed for ${commonName}`);
    }

    return {
      csrPem: forge.pki.certificationRequestToPem(csr),
      privateKeyPem: forge.pki.privateKeyToPem(keys.privateKey),
    };
  }
}

module.exports = { TenantCaOrchestrator, TENANTS_DIR };
