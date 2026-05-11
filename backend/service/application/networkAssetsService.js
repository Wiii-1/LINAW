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

  // const { name, description, orgs } = validated.body;


  // Copilot note: Blockchain/network methods - separated from asset registry operations
async networkCreate({ body, user }) {
  const validated = this.validate("networkCreateSchema", body);
  const { config } = validated;
  const { name, orgs } = config;

  try {

    // const createdNetwork = await assetService.networkCreate({
    //   name,
    //   orgs,
    //   requestedBy: user?.uid,
    // });


    const orchestration = await networkProvisioningService.provisionNetwork({
      user_id: user?.uid,
      config
    })

    return {
      orchestration
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

    return await assetService.channelCreate({
      id,
      name,
      memberOrgs,
      requestedBy: user?.uid,
    });
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

  async createAsset({ body, user }) {
    if (!user?.tenantId) {
      throw new AppError('Tenant context required', 403, 'MISSING_TENANT_CONTEXT');
    }

    const validated = this.validate("createAssetSchema", { body });

    const { id, color, size, owner, appraisedValue } = validated.body;

    await assetRegistryDao.createAsset({
      id,
      tenantId: user.tenantId,
      color,
      size,
      owner,
      appraisedValue,
      requestedBy: user.uid,
    });

    return await assetService.createAsset({
      id,
      tenantId: user.tenantId,
      color,
      size,
      owner,
      appraisedValue,
      requestedBy: user.uid,
    });
  }

  async assetTransfer({ params, body, user }) {
    if (!user?.tenantId) {
      throw new AppError('Tenant context required', 403, 'MISSING_TENANT_CONTEXT');
    }

    const validated = this.validate("assetTransferSchema", { params, body });

    const { id } = validated.params;
    const { owner } = validated.body;

    await assetRegistryDao.assetTransfer({
      id,
      tenantId: user.tenantId,
      owner,
      requestedBy: user.uid,
    });

    return await assetService.assetTransfer({
      id,
      tenantId: user.tenantId,
      owner,
      requestedBy: user.uid,
    });
  }

  async assetUpdate({ params, body, user }) {
    if (!user?.tenantId) {
      throw new AppError('Tenant context required', 403, 'MISSING_TENANT_CONTEXT');
    }

    const validated = this.validate("assetUpdateSchema", { params, body });

    const { id } = validated.params;
    const { color, size, owner, appraisedValue } = validated.body;

    await assetRegistryDao.assetUpdate({
      id,
      tenantId: user.tenantId,
      color,
      size,
      owner,
      appraisedValue,
      requestedBy: user.uid,
    });

    return await assetService.assetUpdate({
      id,
      tenantId: user.tenantId,
      color,
      size,
      owner,
      appraisedValue,
      requestedBy: user.uid,
    });
  }

  async assetDelete({ params, user }) {
    if (!user?.tenantId) {
      throw new AppError('Tenant context required', 403, 'MISSING_TENANT_CONTEXT');
    }

    const validated = this.validate("assetDeleteSchema", { params });

    const { id } = validated.params;

    await assetRegistryDao.assetDelete({
      id,
      tenantId: user.tenantId,
      requestedBy: user.uid,
    });

    return await assetService.assetDelete({
      id,
      tenantId: user.tenantId,
      requestedBy: user.uid,
    });
  }

  async assetRead({ params, user }) {
    if (!user?.tenantId) {
      throw new AppError('Tenant context required', 403, 'MISSING_TENANT_CONTEXT');
    }

    const validated = this.validate("assetReadSchema", { params });

    const { id } = validated.params;

    return await assetService.assetRead({
      id,
      tenantId: user.tenantId,
      requestedBy: user.uid,
    });
  }

  async assetReadAll({ user }) {
    if (!user?.tenantId) {
      throw new AppError('Tenant context required', 403, 'MISSING_TENANT_CONTEXT');
    }

    return await assetService.assetReadAll({
      tenantId: user.tenantId,
      requestedBy: user.uid,
    });
  }
}

module.exports = new networkAssetsService();
