const { createServer } = require('net');

const TLS_CA_BASE = 7054;
const ORG_CA_BASE = 8054;
const TLS_OPS_BASE = 17054;
const ORG_OPS_BASE = 18054;
const PEER_BASE = 9051;
const CHAINCODE_BASE = 10051;
const COUCHDB_BASE = 5984;
const ORDERER_BASE = 11050;
const ORDERER_ADMIN_BASE = 12050;
const OPERATIONS_BASE = 9443;
const PORT_RANGE_SIZE = 200;

function buildPortRange(base) {
  return Array.from({ length: PORT_RANGE_SIZE }, (_, index) => base + index);
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.unref();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

async function pickAvailablePort(candidates, reserved) {
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  for (const port of shuffled) {
    if (reserved.has(port)) continue;
    if (await isPortAvailable(port)) return port;
  }
  return null;
}

async function allocateTenantPorts(reservedPorts = []) {
  const reserved = new Set(reservedPorts);

  const tlsCaPort = await pickAvailablePort(buildPortRange(TLS_CA_BASE), reserved);
  if (tlsCaPort === null) throw new Error('No available TLS CA port in range');
  reserved.add(tlsCaPort);

  const orgCaPort = await pickAvailablePort(buildPortRange(ORG_CA_BASE), reserved);
  if (orgCaPort === null) throw new Error('No available Org CA port in range');
  reserved.add(orgCaPort);

  const tlsCaOpsPort = await pickAvailablePort(buildPortRange(TLS_OPS_BASE), reserved);
  if (tlsCaOpsPort === null) throw new Error('No available TLS CA operations port in range');
  reserved.add(tlsCaOpsPort);

  const orgCaOpsPort = await pickAvailablePort(buildPortRange(ORG_OPS_BASE), reserved);
  if (orgCaOpsPort === null) throw new Error('No available Org CA operations port in range');

  return { tlsCaPort, orgCaPort, tlsCaOpsPort, orgCaOpsPort };
}

async function allocatePeerPorts(reservedPorts = []) {
  const reserved = new Set(reservedPorts);

  const peerPort = await pickAvailablePort(buildPortRange(PEER_BASE), reserved);
  if (peerPort === null) throw new Error('No available peer port in range');
  reserved.add(peerPort);

  const chaincodePort = await pickAvailablePort(buildPortRange(CHAINCODE_BASE), reserved);
  if (chaincodePort === null) throw new Error('No available chaincode port in range');
  reserved.add(chaincodePort);

  const couchdbPort = await pickAvailablePort(buildPortRange(COUCHDB_BASE), reserved);
  if (couchdbPort === null) throw new Error('No available CouchDB port in range');
  reserved.add(couchdbPort);

  const operationsPort = await pickAvailablePort(buildPortRange(OPERATIONS_BASE), reserved);
  if (operationsPort === null) throw new Error('No available operations port in range');

  return { peerPort, chaincodePort, couchdbPort, operationsPort };
}

async function allocateOrdererPorts(reservedPorts = []) {
  const reserved = new Set(reservedPorts);

  const ordererPort = await pickAvailablePort(buildPortRange(ORDERER_BASE), reserved);
  if (ordererPort === null) throw new Error('No available orderer port in range');
  reserved.add(ordererPort);

  const ordererAdminPort = await pickAvailablePort(buildPortRange(ORDERER_ADMIN_BASE), reserved);
  if (ordererAdminPort === null) throw new Error('No available orderer admin port in range');
  reserved.add(ordererAdminPort);

  const operationsPort = await pickAvailablePort(buildPortRange(OPERATIONS_BASE), reserved);
  if (operationsPort === null) throw new Error('No available orderer operations port in range');

  return { ordererPort, ordererAdminPort, operationsPort };
}

module.exports = {
  allocateTenantPorts,
  allocatePeerPorts,
  allocateOrdererPorts,
  isPortAvailable,
};
