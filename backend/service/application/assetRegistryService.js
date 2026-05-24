const { v4: uuidv4 } = require('uuid');

class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = 400;
    this.details = details;
  }
}

const assetRegistrySchema = require("../../validators/fabric/assetRegistrySchema");
const AppError = require("../../utils/AppError");
const assetService = require("../fabric/assetRegistry");
const assetRegistryDao = require("../../dao/chaincodeMetadata/assetRegistryDao");

class assetRegistryService {
  constructor() {
    this.schemas = assetRegistrySchema;
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

  async createAsset({ body, user }) {
    if (!user?.tenantId) {
      throw new AppError('Tenant context required', 403, 'MISSING_TENANT_CONTEXT');
    }

    const validated = this.validate("createAssetSchema", { body });

      // FIRST: Extract all fields from validated body
    const { color, size, owner, appraisedValue } = validated.body;

    const id = (validated.body.id && validated.body.id.trim()) 
    ? validated.body.id 
    : uuidv4(); 


    const asset = await assetRegistryDao.createAsset({
      id,
      tenantId: user.tenantId,
      color,
      size,
      owner: user.uid, 
      appraisedValue,
      requestedBy: user.uid,
    });

    return asset;

    // return await assetService.createAsset({
    //   id,
    //   tenantId: user.tenantId,
    //   color,
    //   size,
    //   owner,
    //   appraisedValue,
    //   requestedBy: user.uid,
    // });

    }

  async assetTransfer({ params, body, user }) {
    if (!user?.tenantId) {
      throw new AppError('Tenant context required', 403, 'MISSING_TENANT_CONTEXT');
    }

    const validated = this.validate("assetTransferSchema", { params, body });

    const { id } = validated.params;
    const { owner } = validated.body;

    const asset = await assetRegistryDao.assetTransfer({
      id,
      tenantId: user.tenantId,
      owner,
      requestedBy: user.uid,
    });

    return {
      message: "Asset transferred successfully",
        data: {
          id: asset.asset_id ?? asset.id,
          color: asset.color,
          size: asset.size,
          owner: asset.owner,
          appraisedValue: asset.appraised_value ?? asset.appraisedValue,
          created_at: asset.created_at,
          updated_at: asset.updated_at,
        },
      };
    

    // return await assetService.assetTransfer({
    //   id,
    //   tenantId: user.tenantId,
    //   owner,
    //   requestedBy: user.uid,
    // });
  }

  async assetUpdate({ params, body, user }) {
    if (!user?.tenantId) {
      throw new AppError('Tenant context required', 403, 'MISSING_TENANT_CONTEXT');
    }

    const validated = this.validate("assetUpdateSchema", { params, body });

    const { id } = validated.params;
    const { color, size, owner, appraisedValue } = validated.body;

    const asset = await assetRegistryDao.assetUpdate({
      id,
      tenantId: user.tenantId,
      color,
      size,
      owner,
      appraisedValue,
      requestedBy: user.uid,
    });

    return asset;

    // return await assetService.assetUpdate({
    //   id,
    //   tenantId: user.tenantId,
    //   color,
    //   size,
    //   owner,
    //   appraisedValue,
    //   requestedBy: user.uid,
    // });
  }

  async assetDelete({ params, user }) {
    if (!user?.tenantId) {
      throw new AppError('Tenant context required', 403, 'MISSING_TENANT_CONTEXT');
    }

    const validated = this.validate("assetDeleteSchema", { params });

    const { id } = validated.params;

    const asset = await assetRegistryDao.assetDelete({
      id,
      tenantId: user.tenantId,
      requestedBy: user.uid,
    });

    return asset;

    // return await assetService.assetDelete({
    //   id,
    //   tenantId: user.tenantId,
    //   requestedBy: user.uid,
    // });
  }

  async assetRead({ params, user }) {
    if (!user?.tenantId) {
      throw new AppError('Tenant context required', 403, 'MISSING_TENANT_CONTEXT');
    } 

    const validated = this.validate("assetReadSchema", { params });
    const { id } = validated.params;

    const asset = await assetRegistryDao.assetRead({
      id,
      tenantId: user.tenantId,
    });

    if (!asset) {
      throw new AppError("Asset not found", 404, "ASSET_NOT_FOUND");
    }

    return {
      message: "Asset fetched successfully",
      data: {
        id: asset.asset_id ?? asset.id,
        color: asset.color,
        size: asset.size,
        owner: asset.owner,
        appraisedValue: asset.appraised_value ?? asset.appraisedValue,
        created_at: asset.created_at,
        updated_at: asset.updated_at,
      },
    };
  }

  async assetReadAll({ user }) {
    if (!user?.tenantId) {
      throw new AppError('Tenant context required', 403, 'MISSING_TENANT_CONTEXT');
    }

    const assets = await assetRegistryDao.assetReadAll({
      tenantId: user.tenantId,
    });

    return {
      message: "Assets fetched successfully",
      data: assets.map((asset) => ({
        id: asset.asset_id ?? asset.id,
        color: asset.color,
        size: asset.size,
        owner: asset.owner,
        appraisedValue: asset.appraised_value ?? asset.appraisedValue,
        created_at: asset.created_at,
        updated_at: asset.updated_at,
      })),
    };
  }
}

module.exports = new assetRegistryService();


    // return await assetService.assetRead({
    //   id,
    //   tenantId: user.tenantId,
    //   requestedBy: user.uid,
    // });

    // return await assetService.assetReadAll({
    //   tenantId: user.tenantId,
    //   requestedBy: user.uid,
    // });