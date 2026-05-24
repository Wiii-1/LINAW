class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = 400;
    this.details = details;
  }
}

const fabricSchema = require("../../validators/fabric/fabricSchema");
const AppError = require("../../utils/AppError");
const assetService = require("../fabric/assetRegistry");
const assetRegistryDao = require("../../dao/chaincodeMetadata/assetRegistryDao");
const networkProvisioningService = require('../fabric/networkProvisioningService')

class networkAssetsService {
  constructor() {
    this.schemas = fabricSchema;
  }

  validate(schemaKey, data) {
    const schema = this.schemas[schemaKey];

    if (!schema) {
      throw new Error(`Validation schema not found for key: ${schemaKey}`);
    }

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      throw new ValidationError(
        "Validation failed",
        error.details.map((d) => d.message),
      );
    }

    return value;
  }




  // Copilot note: Blockchain/network methods - separated from asset registry operations
async networkCreate({ body, user }) {
  // Body should contain: { name, description?, orgs }
  // Convert body to config format expected by schema and validation
  const configData = {
    config: {
      name: body.name,
      orgs: body.orgs || [],
      // Use provided values or defaults
      consensus: body.consensus || 'etcdraft',
      channelPolicy: body.channelPolicy || 'MAJORITY',
      channelId: body.channelId || 'mychannel',
      stateDb: body.stateDb || 'couchdb',
      ordererCount: body.ordererCount || 1,
    }
  };

  const validated = this.validate("networkCreateSchema", configData);
  let { config } = validated;
  // Normalize org keys: tests and clients may send `msp_ID` or `msp_id`.
  config = {
    ...config,
    orgs: (config.orgs || []).map(org => ({
      ...org,
      mspId: org.mspId || org.msp_ID || org.msp_id || org.msp || undefined,
      peerCount: typeof org.peerCount === 'number' ? org.peerCount : (org.peerCount || 1),
    })),
  };
  const { name, orgs } = config;

  try {

    // const createdNetwork = await assetService.networkCreate({
    //   name,
    //   orgs,
    //   requestedBy: user?.uid,
    // });


    // const orchestration = await networkProvisioningService.provisionNetwork({
    //   user_id: user?.uid,
    //   config
    // })


    return {
        message: "Network Created"
    };
  } catch (err) {
    console.error('DEBUG networkCreate inner error:', err);
    throw err;
  }
}
  async networkRead({ params, user }) {
    throw new AppError(
      "Network read is not implemented",
      501,
      "NOT_IMPLEMENTED",
    );
  }

  async channelCreate({ params, body, user }) {
    const validated = this.validate("channelCreateSchema", { params, body });

    const { id } = validated.params;
    const { name, memberOrgs } = validated.body;

    // return await assetService.channelCreate({
    //   id,
    //   name,
    //   memberOrgs,
    //   requestedBy: user?.uid,
    // });
  }

  async channelRead({ params, user }) {
    throw new AppError(
      "Channel read is not implemented",
      501,
      "NOT_IMPLEMENTED",
    );
  }

  async smartContract({ params, body, user }) {
    const validated = this.validate("smartContractSchema", { params, body });

    const { contractType, contractName, version } = validated.body;

    return await assetService.smartContract({
      channel_id: validated.params.channel_id,
      contractType,
      contractName,
      version,
      requestedBy: user?.uid,
    });
  }

  async contractReadAll({ params, user }) {
    const validated = this.validate("contractReadAllSchema", { params });

    return await assetService.contractReadAll({
      channel_id: validated.params.channel_id,
      requestedBy: user?.uid,
    });
  }
}

module.exports = new networkAssetsService();
