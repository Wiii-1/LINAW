<<<<<<< HEAD
<<<<<<<< HEAD:backend/orchestration/configGenerator.js
const yaml = require('js-yaml');
const logger = require('../utils/logger');
========
const yaml = require("js-yaml");
>>>>>>>> a4736ffa (chore(git): rebase preparation through squashing):backend/service/configGenerator.js
=======
const yaml = require('js-yaml');
const logger = require('../utils/logger');
>>>>>>> f20ec437488b0fd3226afa88d50dbaa383544ddf

/*
TODO:
 - change hardcoded username and pass
 - add option for different orderer type (Raft / BFT)
 - maybe admins can configure policies? (still not sure)
 - implement vault (sercret management)
*/

/* 
NOTE:
  generateConfigtx:
  - it acts like a template that will be used for configtxgen later for genesis block and channel creation 
  - it bassicaly lists all orgs, define the policies and permission (reader, writer, admin, endorser),
    create a raft orderer consortium, create a main channel that joins all orgs.
  
  generateDockerCompose:
  - it creates a docker to spin up the network.
  - it creates a single TLS-CA, 1 Orderer CA, (1 Orderer and 1 or more peers for each org and 1 statedatabase),
    1 or more Orderer Node for Raft, and connect all on a single docker network 
*/

// Default config
function applyDefaults(config) {
  return {
<<<<<<< HEAD
    consensus: "etcdraft",
    channelPolicy: "MAJORITY",
    stateDb: "couchdb",
    ordererCount: 1,
    resources: {
      peer: { cpus: "0.5", memory: "512M" },
      orderer: { cpus: "0.25", memory: "256M" },
      ca: { cpus: "0.1", memory: "128M" },
    },
    ...config,
    resources: {
      peer: { cpus: "0.5", memory: "512M" },
      orderer: { cpus: "0.25", memory: "256M" },
      ca: { cpus: "0.1", memory: "128M" },
=======
    consensus: 'etcdraft',
    channelPolicy: 'MAJORITY',
    stateDb: 'couchdb',
    ordererCount: 1,
    resources: {
      peer: { cpus: '0.5', memory: '512M' },
      orderer: { cpus: '0.25', memory: '256M' },
      ca: { cpus: '0.1', memory: '128M' },
    },
    ...config,
    resources: {
      peer: { cpus: '0.5', memory: '512M' },
      orderer: { cpus: '0.25', memory: '256M' },
      ca: { cpus: '0.1', memory: '128M' },
>>>>>>> f20ec437488b0fd3226afa88d50dbaa383544ddf
      ...(config.resources || {}),
    },
  };
}

<<<<<<< HEAD
// configtx.yaml
function generateConfigtx(rawConfig) {
  const config = applyDefaults(rawConfig);

  const orgDefs = config.orgs.map((org) => ({
=======
// configtx.yaml 
function generateConfigtx(rawConfig) {
  const config = applyDefaults(rawConfig);

  const orgDefs = config.orgs.map(org => ({
>>>>>>> f20ec437488b0fd3226afa88d50dbaa383544ddf
    Name: org.name,
    ID: org.mspId,
    MSPDir: `crypto-config/${org.name}/msp`,
    Policies: {
<<<<<<< HEAD
      Readers: {
        Type: "Signature",
        Rule: `OR('${org.mspId}.admin', '${org.mspId}.peer', '${org.mspId}.client')`,
      },
      Writers: {
        Type: "Signature",
        Rule: `OR('${org.mspId}.admin', '${org.mspId}.client')`,
      },
      Admins: { Type: "Signature", Rule: `OR('${org.mspId}.admin')` },
      Endorsement: { Type: "Signature", Rule: `OR('${org.mspId}.peer')` },
=======
      Readers: { Type: 'Signature', Rule: `OR('${org.mspId}.admin', '${org.mspId}.peer', '${org.mspId}.client')` },
      Writers: { Type: 'Signature', Rule: `OR('${org.mspId}.admin', '${org.mspId}.client')` },
      Admins: { Type: 'Signature', Rule: `OR('${org.mspId}.admin')` },
      Endorsement: { Type: 'Signature', Rule: `OR('${org.mspId}.peer')` },
>>>>>>> f20ec437488b0fd3226afa88d50dbaa383544ddf
    },
    AnchorPeers: [{ Host: `peer0.${org.name}`, Port: org.peerPort }],
  }));

  const ordererOrg = {
<<<<<<< HEAD
    Name: "OrdererOrg",
    ID: "OrdererMSP",
    MSPDir: "crypto-config/ordererOrg/msp",
    Policies: {
      Readers: { Type: "Signature", Rule: `OR('OrdererMSP.member')` },
      Writers: { Type: "Signature", Rule: `OR('OrdererMSP.member')` },
      Admins: { Type: "Signature", Rule: `OR('OrdererMSP.admin')` },
=======
    Name: 'OrdererOrg',
    ID: 'OrdererMSP',
    MSPDir: 'crypto-config/ordererOrg/msp',
    Policies: {
      Readers: { Type: 'Signature', Rule: `OR('OrdererMSP.member')` },
      Writers: { Type: 'Signature', Rule: `OR('OrdererMSP.member')` },
      Admins: { Type: 'Signature', Rule: `OR('OrdererMSP.admin')` },
>>>>>>> f20ec437488b0fd3226afa88d50dbaa383544ddf
    },
  };
  const ordererCount = config.ordererCount || 1;
  const consenters = Array.from({ length: ordererCount }, (_, i) => ({
<<<<<<< HEAD
    Host: i === 0 ? "orderer" : `orderer${i + 1}`,
    Port: 7050,
    ClientTLSCert: `crypto-config/ordererOrg/orderers/${i === 0 ? "orderer" : `orderer${i + 1}`}/tls/signcerts/cert.pem`,
    ServerTLSCert: `crypto-config/ordererOrg/orderers/${i === 0 ? "orderer" : `orderer${i + 1}`}/tls/signcerts/cert.pem`,
  }));

  const ordererAddresses = Array.from({ length: ordererCount }, (_, i) =>
    i === 0 ? "orderer:7050" : `orderer${i + 1}:7050`,
  );
  const endorsementRule =
    config.channelPolicy === "ALL"
      ? { Type: "ImplicitMeta", Rule: "ALL Writer" }
      : config.channelPolicy === "ANY"
        ? { Type: "ImplicitMeta", Rule: "ANY Writer" }
        : { Type: "ImplicitMeta", Rule: "MAJORITY Writer" };
  const ordererSection = {
    OrdererType: config.consensus,
    Addresses: ordererAddresses,
    BatchTimeout: "2s",
    BatchSize: {
      MaxMessageCount: 10,
      AbsoluteMaxBytes: "99 MB",
      PreferredMaxBytes: "512 KB",
=======
    Host: i === 0 ? 'orderer' : `orderer${i + 1}`,
    Port: 7050,
    ClientTLSCert: `crypto-config/ordererOrg/orderers/${i === 0 ? 'orderer' : `orderer${i + 1}`}/tls/signcerts/cert.pem`,
    ServerTLSCert: `crypto-config/ordererOrg/orderers/${i === 0 ? 'orderer' : `orderer${i + 1}`}/tls/signcerts/cert.pem`,
  }));

  const ordererAddresses = Array.from({ length: ordererCount }, (_, i) =>
    i === 0 ? 'orderer:7050' : `orderer${i + 1}:7050`
  );
  const endorsementRule =
    config.channelPolicy === 'ALL' ? { Type: 'ImplicitMeta', Rule: 'ALL Writer' } :
      config.channelPolicy === 'ANY' ? { Type: 'ImplicitMeta', Rule: 'ANY Writer' } :
        { Type: 'ImplicitMeta', Rule: 'MAJORITY Writer' };
  const ordererSection = {
    OrdererType: config.consensus,
    Addresses: ordererAddresses,
    BatchTimeout: '2s',
    BatchSize: {
      MaxMessageCount: 10,
      AbsoluteMaxBytes: '99 MB',
      PreferredMaxBytes: '512 KB',
>>>>>>> f20ec437488b0fd3226afa88d50dbaa383544ddf
    },
    EtcdRaft: { Consenters: consenters },
    Organizations: [ordererOrg],
    Policies: {
<<<<<<< HEAD
      Readers: { Type: "ImplicitMeta", Rule: "ANY Readers" },
      Writers: { Type: "ImplicitMeta", Rule: "ANY Writers" },
      Admins: { Type: "ImplicitMeta", Rule: "MAJORITY Admins" },
      BlockValidation: { Type: "ImplicitMeta", Rule: "ANY Writers" },
=======
      Readers: { Type: 'ImplicitMeta', Rule: 'ANY Readers' },
      Writers: { Type: 'ImplicitMeta', Rule: 'ANY Writers' },
      Admins: { Type: 'ImplicitMeta', Rule: 'MAJORITY Admins' },
      BlockValidation: { Type: 'ImplicitMeta', Rule: 'ANY Writers' },
>>>>>>> f20ec437488b0fd3226afa88d50dbaa383544ddf
    },
    Capabilities: { V2_0: true },
  };

  const applicationSection = {
    Organizations: orgDefs,
    Capabilities: { V2_0: true },
    Policies: {
<<<<<<< HEAD
      Readers: { Type: "ImplicitMeta", Rule: "ANY Readers" },
      Writers: { Type: "ImplicitMeta", Rule: "ANY Writers" },
      Admins: { Type: "ImplicitMeta", Rule: "MAJORITY Admins" },
      LifecycleEndorsement: {
        Type: "ImplicitMeta",
        Rule: "MAJORITY Endorsement",
      },
=======
      Readers: { Type: 'ImplicitMeta', Rule: 'ANY Readers' },
      Writers: { Type: 'ImplicitMeta', Rule: 'ANY Writers' },
      Admins: { Type: 'ImplicitMeta', Rule: 'MAJORITY Admins' },
      LifecycleEndorsement: { Type: 'ImplicitMeta', Rule: 'MAJORITY Endorsement' },
>>>>>>> f20ec437488b0fd3226afa88d50dbaa383544ddf
      Endorsement: endorsementRule,
    },
  };

<<<<<<< HEAD
  logger.debug(
    `[DEBUG] configtxgen: ${ordererCount} orderer(s), consensus=${config.consensus}, policy=${config.channelPolicy}`,
  );
=======
  logger.debug(`[DEBUG] configtxgen: ${ordererCount} orderer(s), consensus=${config.consensus}, policy=${config.channelPolicy}`);
>>>>>>> f20ec437488b0fd3226afa88d50dbaa383544ddf

  const channelSection = {
    Policies: {
      Readers: { Type: 'ImplicitMeta', Rule: 'ANY Readers' },
      Writers: { Type: 'ImplicitMeta', Rule: 'ANY Writers' },
      Admins: { Type: 'ImplicitMeta', Rule: 'MAJORITY Admins' },
    },
    Capabilities: { V2_0: true },
  };

  return yaml.dump({
    Organizations: [ordererOrg, ...orgDefs],

    Capabilities: {
      Channel: { V2_0: true },
      Orderer: { V2_0: true },
      Application: { V2_0: true },
    },

    Application: applicationSection,
    Orderer: ordererSection,

<<<<<<< HEAD
<<<<<<<< HEAD:backend/orchestration/configGenerator.js
    Channel: channelSection,
========
    Channel: {
      Policies: {
        Readers: { Type: "ImplicitMeta", Rule: "ANY Readers" },
        Writers: { Type: "ImplicitMeta", Rule: "ANY Writers" },
        Admins: { Type: "ImplicitMeta", Rule: "MAJORITY Admins" },
      },
      Capabilities: { V2_0: true },
    },
>>>>>>>> a4736ffa (chore(git): rebase preparation through squashing):backend/service/configGenerator.js
=======
    Channel: channelSection,
>>>>>>> f20ec437488b0fd3226afa88d50dbaa383544ddf

    Profiles: {
      OrdererGenesis: {
        Policies: channelSection.Policies,
        Capabilities: channelSection.Capabilities,
        Orderer: ordererSection,
        Consortiums: { MainConsortium: { Organizations: orgDefs } },
      },
      MainChannel: {
<<<<<<< HEAD
<<<<<<<< HEAD:backend/orchestration/configGenerator.js
        Policies: channelSection.Policies,
        Capabilities: channelSection.Capabilities,
        Consortium: 'MainConsortium',
========
        Consortium: "MainConsortium",
>>>>>>>> a4736ffa (chore(git): rebase preparation through squashing):backend/service/configGenerator.js
=======
        Policies: channelSection.Policies,
        Capabilities: channelSection.Capabilities,
        Consortium: 'MainConsortium',
>>>>>>> f20ec437488b0fd3226afa88d50dbaa383544ddf
        Application: applicationSection,
      },
    },
  });
}

const fabricCAVersion = process.env.FABRICCAVERSION || '1.5';
const fabricCaImage = process.env.FABRIC_CA_IMAGE || `linaw/fabric-ca:${fabricCAVersion}`;

// docker-compose.yml
function generateDockerCompose(userId, rawConfig) {
  const config = applyDefaults(rawConfig);

  const net = `fabric-${userId}`;
  const services = {};
  const volumes = {};

<<<<<<< HEAD
<<<<<<<< HEAD:backend/orchestration/configGenerator.js
=======
>>>>>>> f20ec437488b0fd3226afa88d50dbaa383544ddf
  const fabricVersion = process.env.FABRIC_VERSION || '2.5';
  const fabricCAVersion = process.env.FABRIC_CA_VERSION || '1.5';
  // Copilot note: fix operator precedence so `leveldb` correctly disables CouchDB.
  const useCouchDB = ((config.stateDb || 'couchdb') === 'couchdb');
<<<<<<< HEAD
========
  const fabricVersion = process.env.FABRIC_VERSION || "2.5";
  const fabricCAVersion = process.env.FABRIC_CA_VERSION || "1.5";
  const useCouchDB = config.stateDb || "couchdb" === "couchdb";
>>>>>>>> a4736ffa (chore(git): rebase preparation through squashing):backend/service/configGenerator.js
=======
>>>>>>> f20ec437488b0fd3226afa88d50dbaa383544ddf
  const res = config.resources;

  function netWithAliases(aliases = []) {

    return { [net]: { aliases } };
  }

  function resourceLimits(type) {
    const r = res[type];
    if (!r) return undefined;
    return { limits: { cpus: r.cpus, memory: r.memory } };
  }
  const logConfig = {
<<<<<<< HEAD
    driver: "json-file",
    options: { "max-size": "10m", "max-file": "3" },
=======
    driver: 'json-file',
    options: { 'max-size': '10m', 'max-file': '3' },
>>>>>>> f20ec437488b0fd3226afa88d50dbaa383544ddf
  };

  // TLS CA
  services[`tls-ca-${userId}`] = {
    image: fabricCaImage,
    container_name: `tls-ca-${userId}`,
    hostname: `tls-ca-${userId}`,
    environment: [
<<<<<<< HEAD
      "FABRIC_CA_HOME=/etc/hyperledger/fabric-ca-server",
      "FABRIC_CA_SERVER_CA_NAME=tls-ca",
      "FABRIC_CA_SERVER_TLS_ENABLED=true",
      `FABRIC_CA_SERVER_PORT=${config.tlsCaPort}`,
      `FABRIC_CA_SERVER_OPERATIONS_LISTENADDRESS=0.0.0.0:1${config.tlsCaPort}`,
      // Bootstrap credentials from environment — override in production
      "FABRIC_CA_SERVER_BOOTSTRAP_USER=tls-admin",
      "FABRIC_CA_SERVER_BOOTSTRAP_PASS=tls-adminpw",
=======
      'FABRIC_CA_HOME=/etc/hyperledger/fabric-ca-server',
      'FABRIC_CA_SERVER_CA_NAME=tls-ca',
      'FABRIC_CA_SERVER_TLS_ENABLED=true',
      `FABRIC_CA_SERVER_PORT=${config.tlsCaPort}`,
      `FABRIC_CA_SERVER_OPERATIONS_LISTENADDRESS=0.0.0.0:1${config.tlsCaPort}`,
      // Bootstrap credentials from environment — override in production
      'FABRIC_CA_SERVER_BOOTSTRAP_USER=tls-admin',
      'FABRIC_CA_SERVER_BOOTSTRAP_PASS=tls-adminpw',
>>>>>>> f20ec437488b0fd3226afa88d50dbaa383544ddf
    ],
    command: `fabric-ca-server start -b tls-admin:tls-adminpw --port ${config.tlsCaPort}`,
    ports: [`${config.tlsCaPort}:${config.tlsCaPort}`],
    // Volume host path must resolve to: <workspace>/crypto-config/tls-ca
    // Example (dev-user / test-network-1): /home/wii/LINAW/.workspaces/dev-user/networks/test-network-1/crypto-config/tls-ca
    volumes: [`./crypto-config/tls-ca:/etc/hyperledger/fabric-ca-server`],
    networks: [net],
    logging: logConfig,
<<<<<<< HEAD
    deploy: { resources: resourceLimits("ca") },
    restart: "unless-stopped",
    healthcheck: {
      test: [
        `CMD-SHELL`,
        `curl -sk https://localhost:${config.tlsCaPort}/cainfo || exit 1`,
      ],
      interval: "10s",
      timeout: "5s",
      retries: 5,
      start_period: "10s",
    },
  };

  // Orderer CA
=======
    deploy: { resources: resourceLimits('ca') },
    restart: 'unless-stopped',
    healthcheck: {
      test: [`CMD-SHELL`, `curl -sk https://localhost:${config.tlsCaPort}/cainfo || exit 1`],
      interval: '10s',
      timeout: '5s',
      retries: 5,
      start_period: '10s',
    },
  };

  // Orderer CA 
>>>>>>> f20ec437488b0fd3226afa88d50dbaa383544ddf
  services[`ca-orderer-${userId}`] = {
    image: fabricCaImage,
    container_name: `ca-orderer-${userId}`,
    hostname: `ca-orderer-${userId}`,
    environment: [
<<<<<<< HEAD
      "FABRIC_CA_HOME=/etc/hyperledger/fabric-ca-server",
      "FABRIC_CA_SERVER_CA_NAME=ca-orderer",
      "FABRIC_CA_SERVER_TLS_ENABLED=true",
=======
      'FABRIC_CA_HOME=/etc/hyperledger/fabric-ca-server',
      'FABRIC_CA_SERVER_CA_NAME=ca-orderer',
      'FABRIC_CA_SERVER_TLS_ENABLED=true',
>>>>>>> f20ec437488b0fd3226afa88d50dbaa383544ddf
      `FABRIC_CA_SERVER_PORT=${config.ordererCaPort}`,
    ],
    command: `fabric-ca-server start -b ordereradmin:ordereradminpw --port ${config.ordererCaPort}`,
    ports: [`${config.ordererCaPort}:${config.ordererCaPort}`],
<<<<<<< HEAD
    volumes: [
      `./crypto-config/ordererOrg/ca:/etc/hyperledger/fabric-ca-server`,
    ],
    networks: [net],
    logging: logConfig,
    deploy: { resources: resourceLimits("ca") },
    restart: "unless-stopped",
    healthcheck: {
      test: [
        `CMD-SHELL`,
        `curl -sk https://localhost:${config.ordererCaPort}/cainfo || exit 1`,
      ],
      interval: "10s",
      timeout: "5s",
      retries: 5,
      start_period: "10s",
=======
    volumes: [`./crypto-config/ordererOrg/ca:/etc/hyperledger/fabric-ca-server`],
    networks: [net],
    logging: logConfig,
    deploy: { resources: resourceLimits('ca') },
    restart: 'unless-stopped',
    healthcheck: {
      test: [`CMD-SHELL`, `curl -sk https://localhost:${config.ordererCaPort}/cainfo || exit 1`],
      interval: '10s',
      timeout: '5s',
      retries: 5,
      start_period: '10s',
>>>>>>> f20ec437488b0fd3226afa88d50dbaa383544ddf
    },
  };

  // Org CAs + Peers
<<<<<<< HEAD
  config.orgs.forEach((org) => {
=======
  config.orgs.forEach(org => {
>>>>>>> f20ec437488b0fd3226afa88d50dbaa383544ddf
    services[`ca-${org.name}-${userId}`] = {
      image: fabricCaImage,
      container_name: `ca-${org.name}-${userId}`,
      hostname: `ca-${org.name}-${userId}`,
      environment: [
<<<<<<< HEAD
        "FABRIC_CA_HOME=/etc/hyperledger/fabric-ca-server",
        `FABRIC_CA_SERVER_CA_NAME=ca-${org.name}`,
        "FABRIC_CA_SERVER_TLS_ENABLED=true",
=======
        'FABRIC_CA_HOME=/etc/hyperledger/fabric-ca-server',
        `FABRIC_CA_SERVER_CA_NAME=ca-${org.name}`,
        'FABRIC_CA_SERVER_TLS_ENABLED=true',
>>>>>>> f20ec437488b0fd3226afa88d50dbaa383544ddf
        `FABRIC_CA_SERVER_PORT=${org.caPort}`,
      ],
      command: `fabric-ca-server start -b ${org.name}admin:${org.name}adminpw --port ${org.caPort}`,
      ports: [`${org.caPort}:${org.caPort}`],
<<<<<<< HEAD
      volumes: [
        `./crypto-config/${org.name}/ca:/etc/hyperledger/fabric-ca-server`,
      ],
      networks: [net],
      logging: logConfig,
      deploy: { resources: resourceLimits("ca") },
      restart: "unless-stopped",
      healthcheck: {
        test: [
          `CMD-SHELL`,
          `curl -sk https://localhost:${org.caPort}/cainfo || exit 1`,
        ],
        interval: "10s",
        timeout: "5s",
        retries: 5,
        start_period: "10s",
=======
      volumes: [`./crypto-config/${org.name}/ca:/etc/hyperledger/fabric-ca-server`],
      networks: [net],
      logging: logConfig,
      deploy: { resources: resourceLimits('ca') },
      restart: 'unless-stopped',
      healthcheck: {
        test: [`CMD-SHELL`, `curl -sk https://localhost:${org.caPort}/cainfo || exit 1`],
        interval: '10s',
        timeout: '5s',
        retries: 5,
        start_period: '10s',
>>>>>>> f20ec437488b0fd3226afa88d50dbaa383544ddf
      },
    };

    // Peers
    for (let i = 0; i < org.peerCount; i++) {
      const peerName = `peer${i}-${org.name}-${userId}`;
      const peerPort = org.peerPort + i * 10;
      const peerEnv = [
        `CORE_PEER_ID=peer${i}.${org.name}`,
        `CORE_PEER_ADDRESS=peer${i}.${org.name}:${peerPort}`,
        `CORE_PEER_LISTENADDRESS=0.0.0.0:${peerPort}`,
        `CORE_PEER_CHAINCODEADDRESS=peer${i}.${org.name}:${peerPort + 1}`,
        `CORE_PEER_CHAINCODELISTENADDRESS=0.0.0.0:${peerPort + 1}`,
        `CORE_PEER_GOSSIP_BOOTSTRAP=peer0.${org.name}:${org.peerPort}`,
        `CORE_PEER_GOSSIP_EXTERNALENDPOINT=peer${i}.${org.name}:${peerPort}`,
        `CORE_PEER_LOCALMSPID=${org.mspId}`,
<<<<<<< HEAD
        "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp",
        "CORE_PEER_TLS_ENABLED=true",
        "CORE_PEER_TLS_CERT_FILE=/etc/hyperledger/fabric/tls/signcerts/cert.pem",
        "CORE_PEER_TLS_KEY_FILE=/etc/hyperledger/fabric/tls/keystore/key.pem",
        "CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/tlscacerts/tls-cert.pem",
        "CORE_OPERATIONS_LISTENADDRESS=0.0.0.0:9443",
        "CORE_METRICS_PROVIDER=prometheus",
        `FABRIC_LOGGING_SPEC=${process.env.NODE_ENV === "production" ? "INFO" : "INFO:cauthdsl,configtx,msp,policies,lifecycle,endorser=WARNING"}`,
      ];

      // CouchDB or LevelDB
=======
        'CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp',
        'CORE_PEER_TLS_ENABLED=true',
        'CORE_PEER_TLS_CERT_FILE=/etc/hyperledger/fabric/tls/signcerts/cert.pem',
        'CORE_PEER_TLS_KEY_FILE=/etc/hyperledger/fabric/tls/keystore/key.pem',
        'CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/tlscacerts/tls-cert.pem',
        'CORE_OPERATIONS_LISTENADDRESS=0.0.0.0:9443',
        'CORE_METRICS_PROVIDER=prometheus',
        `FABRIC_LOGGING_SPEC=${process.env.NODE_ENV === 'production' ? 'INFO' : 'INFO:cauthdsl,configtx,msp,policies,lifecycle,endorser=WARNING'}`,
      ];

      // CouchDB or LevelDB 
>>>>>>> f20ec437488b0fd3226afa88d50dbaa383544ddf
      const peerDependsOn = [`ca-${org.name}-${userId}`];
      if (useCouchDB) {
        const couchName = `couchdb-${peerName}`;
        volumes[peerName] = {};

        services[couchName] = {
<<<<<<< HEAD
          image: "couchdb:3.3",
          container_name: couchName,
          environment: ["COUCHDB_USER=admin", "COUCHDB_PASSWORD=password"],
          volumes: [`${couchName}:/opt/couchdb/data`],
          networks: [net],
          logging: logConfig,
          restart: "unless-stopped",
          healthcheck: {
            test: [
              `CMD-SHELL`,
              `curl -sf http://admin:password@localhost:5984/ || exit 1`,
            ],
            interval: "10s",
            timeout: "5s",
            retries: 5,
            start_period: "10s",
=======
          image: 'couchdb:3.3',
          container_name: couchName,
          environment: [
            'COUCHDB_USER=admin',
            'COUCHDB_PASSWORD=password',
          ],
          volumes: [`${couchName}:/opt/couchdb/data`],
          networks: [net],
          logging: logConfig,
          restart: 'unless-stopped',
          healthcheck: {
            test: [`CMD-SHELL`, `curl -sf http://admin:password@localhost:5984/ || exit 1`],
            interval: '10s',
            timeout: '5s',
            retries: 5,
            start_period: '10s',
>>>>>>> f20ec437488b0fd3226afa88d50dbaa383544ddf
          },
        };

        volumes[couchName] = {};
        peerDependsOn.push(couchName);

        peerEnv.push(
<<<<<<< HEAD
          "CORE_LEDGER_STATE_STATEDATABASE=CouchDB",
          `CORE_LEDGER_STATE_COUCHDBCONFIG_COUCHDBADDRESS=couchdb-${peerName}:5984`,
          "CORE_LEDGER_STATE_COUCHDBCONFIG_USERNAME=admin",
          "CORE_LEDGER_STATE_COUCHDBCONFIG_PASSWORD=password",
        );
      } else {
        // LevelDB
        peerEnv.push("CORE_LEDGER_STATE_STATEDATABASE=goleveldb");
=======
          'CORE_LEDGER_STATE_STATEDATABASE=CouchDB',
          `CORE_LEDGER_STATE_COUCHDBCONFIG_COUCHDBADDRESS=couchdb-${peerName}:5984`,
          'CORE_LEDGER_STATE_COUCHDBCONFIG_USERNAME=admin',
          'CORE_LEDGER_STATE_COUCHDBCONFIG_PASSWORD=password',
        );
      } else {
        // LevelDB 
        peerEnv.push('CORE_LEDGER_STATE_STATEDATABASE=goleveldb');
>>>>>>> f20ec437488b0fd3226afa88d50dbaa383544ddf
        volumes[peerName] = {};
      }

      services[peerName] = {
        image: `hyperledger/fabric-peer:${fabricVersion}`,
        container_name: peerName,
        hostname: `peer${i}.${org.name}`,
        environment: peerEnv,
        depends_on: peerDependsOn,
        ports: [`${peerPort}:${peerPort}`],
        volumes: [
          `./crypto-config/${org.name}/peers/peer${i}/msp:/etc/hyperledger/fabric/msp`,
          `./crypto-config/${org.name}/peers/peer${i}/tls:/etc/hyperledger/fabric/tls`,
          `${peerName}:/var/hyperledger/production`,
        ],
        networks: netWithAliases([`peer${i}.${org.name}`, peerName]),
        logging: logConfig,
<<<<<<< HEAD
        deploy: { resources: resourceLimits("peer") },
        restart: "unless-stopped",
        healthcheck: {
          test: [
            `CMD-SHELL`,
            `curl -sf http://localhost:9443/healthz || exit 1`,
          ],
          interval: "15s",
          timeout: "5s",
          retries: 5,
          start_period: "30s",
=======
        deploy: { resources: resourceLimits('peer') },
        restart: 'unless-stopped',
        healthcheck: {
          test: [`CMD-SHELL`, `curl -sf http://localhost:9443/healthz || exit 1`],
          interval: '15s',
          timeout: '5s',
          retries: 5,
          start_period: '30s',
>>>>>>> f20ec437488b0fd3226afa88d50dbaa383544ddf
        },
      };
    }
  });

  // Multi-orderer Raft
  const ordererCount = config.ordererCount || 1;
  const caOrdererDeps = [`ca-orderer-${userId}`];

  for (let i = 0; i < ordererCount; i++) {
<<<<<<< HEAD
    const ordererLabel = i === 0 ? "orderer" : `orderer${i + 1}`;
=======
    const ordererLabel = i === 0 ? 'orderer' : `orderer${i + 1}`;
>>>>>>> f20ec437488b0fd3226afa88d50dbaa383544ddf
    const ordererName = `${ordererLabel}-${userId}`;
    const ordererPort = config.ordererPort + i * 10;

    volumes[ordererName] = {};

    services[ordererName] = {
      image: `hyperledger/fabric-orderer:${fabricVersion}`,
      container_name: ordererName,
      environment: [
<<<<<<< HEAD
        "ORDERER_GENERAL_LISTENADDRESS=0.0.0.0",
        "ORDERER_GENERAL_LISTENPORT=7050",
        "ORDERER_GENERAL_TLS_ENABLED=true",
        "ORDERER_GENERAL_TLS_PRIVATEKEY=/etc/hyperledger/fabric/tls/keystore/key.pem",
        "ORDERER_GENERAL_TLS_CERTIFICATE=/etc/hyperledger/fabric/tls/signcerts/cert.pem",
        "ORDERER_GENERAL_TLS_ROOTCAS=[/etc/hyperledger/fabric/tls/tlscacerts/tls-cert.pem]",
        "ORDERER_GENERAL_CLUSTER_CLIENTCERTIFICATE=/etc/hyperledger/fabric/tls/signcerts/cert.pem",
        "ORDERER_GENERAL_CLUSTER_CLIENTPRIVATEKEY=/etc/hyperledger/fabric/tls/keystore/key.pem",
        "ORDERER_GENERAL_CLUSTER_ROOTCAS=[/etc/hyperledger/fabric/tls/tlscacerts/tls-cert.pem]",
        "ORDERER_GENERAL_BOOTSTRAPMETHOD=file",
        "ORDERER_GENERAL_BOOTSTRAPFILE=/etc/hyperledger/configtx/genesis.block",
        "ORDERER_GENERAL_LOCALMSPID=OrdererMSP",
        "ORDERER_GENERAL_LOCALMSPDIR=/etc/hyperledger/fabric/msp",
        "ORDERER_OPERATIONS_LISTENADDRESS=0.0.0.0:9444",
        "ORDERER_METRICS_PROVIDER=prometheus",
        `FABRIC_LOGGING_SPEC=${process.env.NODE_ENV === "production" ? "INFO" : "INFO"}`,
=======
        'ORDERER_GENERAL_LISTENADDRESS=0.0.0.0',
        'ORDERER_GENERAL_LISTENPORT=7050',
        'ORDERER_GENERAL_TLS_ENABLED=true',
        'ORDERER_GENERAL_TLS_PRIVATEKEY=/etc/hyperledger/fabric/tls/keystore/key.pem',
        'ORDERER_GENERAL_TLS_CERTIFICATE=/etc/hyperledger/fabric/tls/signcerts/cert.pem',
        'ORDERER_GENERAL_TLS_ROOTCAS=[/etc/hyperledger/fabric/tls/tlscacerts/tls-cert.pem]',
        'ORDERER_GENERAL_CLUSTER_CLIENTCERTIFICATE=/etc/hyperledger/fabric/tls/signcerts/cert.pem',
        'ORDERER_GENERAL_CLUSTER_CLIENTPRIVATEKEY=/etc/hyperledger/fabric/tls/keystore/key.pem',
        'ORDERER_GENERAL_CLUSTER_ROOTCAS=[/etc/hyperledger/fabric/tls/tlscacerts/tls-cert.pem]',
        'ORDERER_GENERAL_BOOTSTRAPMETHOD=file',
        'ORDERER_GENERAL_BOOTSTRAPFILE=/etc/hyperledger/configtx/genesis.block',
        'ORDERER_GENERAL_LOCALMSPID=OrdererMSP',
        'ORDERER_GENERAL_LOCALMSPDIR=/etc/hyperledger/fabric/msp',
        'ORDERER_OPERATIONS_LISTENADDRESS=0.0.0.0:9444',
        'ORDERER_METRICS_PROVIDER=prometheus',
        `FABRIC_LOGGING_SPEC=${process.env.NODE_ENV === 'production' ? 'INFO' : 'INFO'}`,
>>>>>>> f20ec437488b0fd3226afa88d50dbaa383544ddf
      ],
      depends_on: caOrdererDeps,
      ports: [`${ordererPort}:7050`],
      volumes: [
        `./channel-artifacts:/etc/hyperledger/configtx`,
        `./crypto-config/ordererOrg/orderers/${ordererLabel}/msp:/etc/hyperledger/fabric/msp`,
        `./crypto-config/ordererOrg/orderers/${ordererLabel}/tls:/etc/hyperledger/fabric/tls`,
        `${ordererName}:/var/hyperledger/production`,
      ],
      hostname: ordererLabel,
      networks: netWithAliases([ordererLabel, ordererName]),
      logging: logConfig,
<<<<<<< HEAD
      deploy: { resources: resourceLimits("orderer") },
      restart: "unless-stopped",
      healthcheck: {
        test: [`CMD-SHELL`, `curl -sf http://localhost:9444/healthz || exit 1`],
        interval: "15s",
        timeout: "5s",
        retries: 5,
        start_period: "30s",
=======
      deploy: { resources: resourceLimits('orderer') },
      restart: 'unless-stopped',
      healthcheck: {
        test: [`CMD-SHELL`, `curl -sf http://localhost:9444/healthz || exit 1`],
        interval: '15s',
        timeout: '5s',
        retries: 5,
        start_period: '30s',
>>>>>>> f20ec437488b0fd3226afa88d50dbaa383544ddf
      },
    };
  }

<<<<<<< HEAD
  logger.debug(
    `[DEBUG] docker-compose: ${ordererCount} orderer(s), stateDb=${config.stateDb || "couchdb"}, orgs=${config.orgs.length}`,
  );

  return yaml.dump({
    version: "3.7",
    networks: {
      [net]: {
        driver: "bridge",
        ipam: {
          driver: "default",
=======
  logger.debug(`[DEBUG] docker-compose: ${ordererCount} orderer(s), stateDb=${config.stateDb || 'couchdb'}, orgs=${config.orgs.length}`);

  return yaml.dump({
    version: '3.7',
    networks: {
      [net]: {
        driver: 'bridge',
        ipam: {
          driver: 'default',
>>>>>>> f20ec437488b0fd3226afa88d50dbaa383544ddf
        },
      },
    },
    services,
    volumes,
  });
}

module.exports = { generateConfigtx, generateDockerCompose };

<<<<<<< HEAD
=======

>>>>>>> f20ec437488b0fd3226afa88d50dbaa383544ddf
/*
Config schema:
{
  name:          string
  channelId:     string
  consensus:     'etcdraft'|'solo'
  channelPolicy: 'MAJORITY'|'ALL'|'ANY'
  stateDb:       'couchdb'|'leveldb'
  ordererCount:  number (1|3|5)
  tlsCaPort:     number
  ordererCaPort: number
  ordererPort:   number
  resources: {
    peer:    { cpus: string, memory: string }
    orderer: { cpus: string, memory: string }
    ca:      { cpus: string, memory: string }
  }
orgs: [{
  name:      string
  mspId:     string
  peerCount: number (1-5)
  caPort:    number
  peerPort:  number
  }]
}
*/
<<<<<<< HEAD
=======

>>>>>>> f20ec437488b0fd3226afa88d50dbaa383544ddf
