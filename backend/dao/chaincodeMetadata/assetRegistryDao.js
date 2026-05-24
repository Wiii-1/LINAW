const db = require("../../db/db");

class AssetRegistryDao {
  async createAsset(data) {
    try {
      const { id, tenantId, color, size, owner, appraisedValue, requestedBy } = data;

      const [asset] = await db("asset_registry")
        .insert({
          asset_id: id,
          tenant_id: tenantId,
          color,
          size,
          owner,
          appraised_value: appraisedValue,
          created_by: requestedBy,
          updated_by: requestedBy,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        })
        .returning("*");

      return asset;
    } catch (error) {
      if (error.code === "23505") throw new Error("ASSET_ALREADY_EXISTS");
      throw error;
    }
  }

  async assetTransfer(data) {
    try {
      const { asset_id, owner, requestedBy } = data;

      const [asset] = await db("asset_registry")
        .where({ asset_id })
        .update({
          owner,
          updated_by: requestedBy,
          updated_at: db.fn.now(),
        })
        .returning("*");

      return asset || null;
    } catch (error) {
      if (error.code === "23505") throw new Error("ASSET_TRANSFER_FAILED");
      throw error;
    }
  }

  async assetUpdate(data) {
    try {
      const { asset_id, color, size, owner, appraisedValue, requestedBy } = data;

      const [asset] = await db("asset_registry")
        .where({ asset_id })
        .update({
          color,
          size,
          owner,
          appraised_value: appraisedValue,
          updated_by: requestedBy,
          updated_at: db.fn.now(),
        })
        .returning("*");

      return asset || null;
    } catch (error) {
      if (error.code === "23505") throw new Error("ASSET_UPDATE_FAILED");
      throw error;
    }
  }

  async assetDelete(data) {
    try {
      const { asset_id } = data;

      const deletedRows = await db("asset_registry").where({ asset_id }).del();

      return deletedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  async assetRead(data) {
    try {
      const { asset_id } = data;

      const asset = await db("asset_registry")
        .select("*")
        .where({ asset_id })
        .first();

      return asset || null;
    } catch (error) {
      throw error;
    }
  }

  async assetReadAll(data) {
    try {
      const assets = await db("asset_registry")
        .select("*")
        .orderBy("created_at", "desc");

      return assets;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AssetRegistryDao();