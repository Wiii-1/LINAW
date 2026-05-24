const { execSync } = require('child_process');
const { existsSync, readFileSync, writeFileSync, rmSync } = require('fs');
const { basename, join } = require('path');
const yaml = require('js-yaml');
const { TENANTS_DIR } = require('../tenantCa/tenantCaOrchestratorService');

const COMPOSE_CMD = process.env.COMPOSE_CMD || 'docker compose';
const FABRIC_VERSION = process.env.FABRIC_VERSION || '2.5';
const FABRIC_PEER_IMAGE = process.env.FABRIC_PEER_IMAGE || `hyperledger/fabric-peer:${FABRIC_VERSION}`;
const FABRIC_ORDERER_IMAGE =
  process.env.FABRIC_ORDERER_IMAGE || `hyperledger/fabric-orderer:${FABRIC_VERSION}`;

function getFabricComposePath(tenantId) {
  return join(TENANTS_DIR, `compose-fabric-${tenantId}.yml`);
}

function loadFabricCompose(tenantId) {
  const path = getFabricComposePath(tenantId);
  if (!existsSync(path)) {
    return { services: {}, volumes: {}, networks: {} };
  }
  return yaml.load(readFileSync(path, 'utf-8')) || { services: {}, volumes: {}, networks: {} };
}

function saveFabricCompose(tenantId, doc) {
  const path = getFabricComposePath(tenantId);
  writeFileSync(path, yaml.dump(doc), 'utf-8');
  return path;
}

function getNetworkName(tenantId) {
  return `fabric_${tenantId}`;
}

function buildBaseNetworks(tenantId) {
  const netName = getNetworkName(tenantId);
  return {
    [netName]: {
      external: true,
      name: netName,
    },
  };
}

function addPeerServices(tenantId, config) {
  const doc = loadFabricCompose(tenantId);
  const netName = getNetworkName(tenantId);
  const peerContainer = `peer0-${config.orgName}-${tenantId}`;
  const couchContainer = `couchdb-${config.orgName}-${tenantId}`;
  const peerHost = `peer0.${config.domain}`;

  doc.networks = buildBaseNetworks(tenantId);

  doc.volumes = doc.volumes || {};
  doc.volumes[peerContainer] = {};
  doc.volumes[couchContainer] = {};

  const cryptoRel = `./${tenantId}/peer-org/crypto-config/${config.orgName}`;

  doc.services[couchContainer] = {
    image: 'couchdb:3.3',
    container_name: couchContainer,
    labels: {
      service: 'hyperledger-fabric',
      tenant: tenantId,
      org_type: 'peer',
    },
    environment: ['COUCHDB_USER=admin', 'COUCHDB_PASSWORD=password'],
    ports: [`127.0.0.1:${config.couchdbPort}:5984`],
    volumes: [`${couchContainer}:/opt/couchdb/data`],
    networks: [netName],
    restart: 'unless-stopped',
  };

  doc.services[peerContainer] = {
    image: FABRIC_PEER_IMAGE,
    container_name: peerContainer,
    labels: {
      service: 'hyperledger-fabric',
      tenant: tenantId,
      org_type: 'peer',
    },
    environment: [
      `CORE_PEER_ID=${peerHost}`,
      `CORE_PEER_ADDRESS=${peerHost}:${config.peerPort}`,
      `CORE_PEER_LISTENADDRESS=0.0.0.0:${config.peerPort}`,
      `CORE_PEER_CHAINCODEADDRESS=${peerHost}:${config.chaincodePort}`,
      `CORE_PEER_CHAINCODELISTENADDRESS=0.0.0.0:${config.chaincodePort}`,
      `CORE_PEER_GOSSIP_BOOTSTRAP=${peerHost}:${config.peerPort}`,
      `CORE_PEER_GOSSIP_EXTERNALENDPOINT=${peerHost}:${config.peerPort}`,
      `CORE_PEER_LOCALMSPID=${config.mspId}`,
      'CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp',
      'CORE_PEER_TLS_ENABLED=true',
      'CORE_PEER_TLS_CERT_FILE=/etc/hyperledger/fabric/tls/signcerts/cert.pem',
      'CORE_PEER_TLS_KEY_FILE=/etc/hyperledger/fabric/tls/keystore/key.pem',
      'CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/tlscacerts/tls-cert.pem',
      `CORE_OPERATIONS_LISTENADDRESS=0.0.0.0:${config.operationsPort}`,
      'CORE_METRICS_PROVIDER=prometheus',
      'CORE_LEDGER_STATE_STATEDATABASE=CouchDB',
      `CORE_LEDGER_STATE_COUCHDBCONFIG_COUCHDBADDRESS=${couchContainer}:5984`,
      'CORE_LEDGER_STATE_COUCHDBCONFIG_USERNAME=admin',
      'CORE_LEDGER_STATE_COUCHDBCONFIG_PASSWORD=password',
      'FABRIC_LOGGING_SPEC=INFO',
    ],
    depends_on: [couchContainer],
    ports: [
      `127.0.0.1:${config.peerPort}:${config.peerPort}`,
      `127.0.0.1:${config.chaincodePort}:${config.chaincodePort}`,
      `127.0.0.1:${config.operationsPort}:${config.operationsPort}`,
    ],
    volumes: [
      `${cryptoRel}/peers/peer0/msp:/etc/hyperledger/fabric/msp`,
      `${cryptoRel}/peers/peer0/tls:/etc/hyperledger/fabric/tls`,
      `${peerContainer}:/var/hyperledger/production`,
    ],
    networks: [netName],
    hostname: peerHost,
    restart: 'unless-stopped',
  };

  saveFabricCompose(tenantId, doc);
  return { peerContainer, couchContainer };
}

function addOrdererServices(tenantId, config) {
  const doc = loadFabricCompose(tenantId);
  const netName = getNetworkName(tenantId);
  const ordererContainer = `orderer-${tenantId}`;
  const ordererHost = `orderer.${config.domain}`;

  doc.networks = buildBaseNetworks(tenantId);

  doc.volumes = doc.volumes || {};
  doc.volumes[ordererContainer] = {};

  const cryptoRel = `./${tenantId}/orderer-org/crypto-config/ordererOrg`;
  const genesisRel = `./${tenantId}/orderer-org/channel-artifacts/genesis.block`;

  doc.services[ordererContainer] = {
    image: FABRIC_ORDERER_IMAGE,
    container_name: ordererContainer,
    labels: {
      service: 'hyperledger-fabric',
      tenant: tenantId,
      org_type: 'orderer',
    },
    environment: [
      'ORDERER_GENERAL_LISTENADDRESS=0.0.0.0',
      `ORDERER_GENERAL_LISTENPORT=${config.ordererPort}`,
      `ORDERER_GENERAL_LOCALMSPID=${config.mspId}`,
      'ORDERER_GENERAL_LOCALMSPDIR=/etc/hyperledger/fabric/msp',
      'ORDERER_GENERAL_TLS_ENABLED=true',
      'ORDERER_GENERAL_TLS_PRIVATEKEY=/etc/hyperledger/fabric/tls/keystore/key.pem',
      'ORDERER_GENERAL_TLS_CERTIFICATE=/etc/hyperledger/fabric/tls/signcerts/cert.pem',
      'ORDERER_GENERAL_TLS_ROOTCAS=[/etc/hyperledger/fabric/tls/tlscacerts/tls-cert.pem]',
      'ORDERER_GENERAL_CLUSTER_CLIENTCERTIFICATE=/etc/hyperledger/fabric/tls/signcerts/cert.pem',
      'ORDERER_GENERAL_CLUSTER_CLIENTPRIVATEKEY=/etc/hyperledger/fabric/tls/keystore/key.pem',
      'ORDERER_GENERAL_CLUSTER_ROOTCAS=[/etc/hyperledger/fabric/tls/tlscacerts/tls-cert.pem]',
      'ORDERER_GENERAL_BOOTSTRAPMETHOD=file',
      `ORDERER_GENERAL_BOOTSTRAPFILE=/var/hyperledger/orderer/genesis.block`,
      'ORDERER_CHANNELPARTICIPATION_ENABLED=true',
      'ORDERER_ADMIN_TLS_ENABLED=true',
      `ORDERER_ADMIN_TLS_LISTENADDRESS=0.0.0.0:${config.ordererAdminPort}`,
      'ORDERER_ADMIN_TLS_CERTIFICATE=/etc/hyperledger/fabric/tls/signcerts/cert.pem',
      'ORDERER_ADMIN_TLS_PRIVATEKEY=/etc/hyperledger/fabric/tls/keystore/key.pem',
      'ORDERER_ADMIN_TLS_ROOTCAS=[/etc/hyperledger/fabric/tls/tlscacerts/tls-cert.pem]',
      'ORDERER_ADMIN_TLS_CLIENTROOTCAS=[/etc/hyperledger/fabric/tls/tlscacerts/tls-cert.pem]',
      `ORDERER_OPERATIONS_LISTENADDRESS=0.0.0.0:${config.operationsPort}`,
      'ORDERER_METRICS_PROVIDER=prometheus',
      'FABRIC_LOGGING_SPEC=INFO',
    ],
    ports: [
      `127.0.0.1:${config.ordererPort}:${config.ordererPort}`,
      `127.0.0.1:${config.ordererAdminPort}:${config.ordererAdminPort}`,
      `127.0.0.1:${config.operationsPort}:${config.operationsPort}`,
    ],
    volumes: [
      `${cryptoRel}/orderers/orderer/msp:/etc/hyperledger/fabric/msp`,
      `${cryptoRel}/orderers/orderer/tls:/etc/hyperledger/fabric/tls`,
      `${genesisRel}:/var/hyperledger/orderer/genesis.block`,
      `${ordererContainer}:/var/hyperledger/production`,
    ],
    networks: [netName],
    hostname: ordererHost,
    restart: 'unless-stopped',
  };

  saveFabricCompose(tenantId, doc);
  return { ordererContainer };
}

function composeUp(tenantId, services = []) {
  const caCompose = join(TENANTS_DIR, `compose-${tenantId}.yml`);
  const fabricCompose = getFabricComposePath(tenantId);

  if (!existsSync(caCompose)) {
    throw new Error(`Tenant CA compose file not found for ${tenantId}`);
  }
  if (!existsSync(fabricCompose)) {
    throw new Error(`Fabric compose file not found for ${tenantId}`);
  }

  const serviceArg = services.length > 0 ? services.join(' ') : '';
  const cmd = `${COMPOSE_CMD} -f ${basename(caCompose)} -f ${basename(fabricCompose)} up -d ${serviceArg}`.trim();
  execSync(cmd, { cwd: TENANTS_DIR, stdio: 'inherit' });
}

function stopFabricContainers(tenantId) {
  const fabricCompose = getFabricComposePath(tenantId);
  const caCompose = join(TENANTS_DIR, `compose-${tenantId}.yml`);

  if (!existsSync(fabricCompose)) return;

  const cmd = `${COMPOSE_CMD} -f ${basename(caCompose)} -f ${basename(fabricCompose)} down`;
  try {
    execSync(cmd, { cwd: TENANTS_DIR, stdio: 'inherit' });
  } catch (error) {
    console.error(`[${tenantId}] fabric compose down failed:`, error);
  }

  rmSync(fabricCompose, { force: true });
}

function removeServicesFromCompose(tenantId, containerNames) {
  const path = getFabricComposePath(tenantId);
  if (!existsSync(path)) return;

  const doc = loadFabricCompose(tenantId);
  for (const name of containerNames) {
    if (doc.services?.[name]) {
      delete doc.services[name];
    }
    if (doc.volumes?.[name]) {
      delete doc.volumes[name];
    }
    try {
      execSync(`docker rm -f ${name}`, { stdio: 'ignore' });
    } catch {
      // ignore
    }
  }

  const remaining = Object.keys(doc.services || {});
  if (remaining.length === 0) {
    rmSync(path, { force: true });
  } else {
    saveFabricCompose(tenantId, doc);
  }
}

function forceStopFabricContainers(tenantId) {
  const safeTenantId = basename(tenantId);
  if (safeTenantId !== tenantId || tenantId.includes('..')) return;

  try {
    const output = execSync(
      `docker ps -aq --filter "label=tenant=${safeTenantId}" --filter "label=org_type"`,
      { encoding: 'utf-8' },
    );
    const ids = output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    for (const id of ids) {
      try {
        execSync(`docker rm -f ${id}`, { stdio: 'ignore' });
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
}

module.exports = {
  addPeerServices,
  addOrdererServices,
  composeUp,
  stopFabricContainers,
  removeServicesFromCompose,
  forceStopFabricContainers,
  getFabricComposePath,
};
