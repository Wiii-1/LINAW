<<<<<<<< HEAD:backend/dao/chaincodeMetadata/assetRegistryDao.js
const db = require('../../db/db');
const AppError = require('../../utils/AppError');

class AssetRegistryDao {
    async createAsset(data) {
        try {

            const {
                id,
                tenantId,
                color,
                size,
                owner,
                appraisedValue,
                requestedBy
            } = data;

            // Insert using `asset_id` as the external identifier. Keep numeric `id` as PK.
            const [asset] = await db('asset_registry')
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
                    updated_at: db.fn.now()
                })
                .returning('*');

            return asset;
        } catch (error) {
            if (error.code === '23505') throw new AppError('Asset already exists', 409, 'ASSET_ALREADY_EXISTS');
            throw error;
        }
========
const db = require("../db/db");

class AssetRegistryDao {
  async createAsset(data) {
    try {
      const { id, color, size, owner, appraisedValue, requestedBy } = data;

      const [asset] = await db("asset_registry")
        .insert({
          id,
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
>>>>>>>> jed:backend/dao/assetRegistryDao.js
    }
  }

<<<<<<<< HEAD:backend/dao/chaincodeMetadata/assetRegistryDao.js
    async assetTransfer(data) {
        try {

            const {
                id,
                tenantId,
                owner,
                requestedBy
            } = data;

            const [asset] = await db('asset_registry')
                .where({ asset_id: id, tenant_id: tenantId })
                .update({
                    owner,
                    updated_by: requestedBy,
                    updated_at: db.fn.now()
                })
                .returning('*');

            return asset || null;
        } catch (error) {
            if (error.code === '23505') throw new AppError('Asset transfer failed', 409, 'ASSET_TRANSFER_FAILED');
            throw error;
        }
========
  async assetTransfer(data) {
    try {
      const { id, owner, requestedBy } = data;

      const [asset] = await db("asset_registry")
        .where({ id })
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
>>>>>>>> jed:backend/dao/assetRegistryDao.js
    }
  }

<<<<<<<< HEAD:backend/dao/chaincodeMetadata/assetRegistryDao.js
    async assetUpdate(data) {
        try {

            const {
                id,
                tenantId,
                color,
                size,
                owner,
                appraisedValue,
                requestedBy
            } = data;

            const [asset] = await db('asset_registry')
                .where({ asset_id: id, tenant_id: tenantId })
                .update({
                    color,
                    size,
                    owner,
                    appraised_value: appraisedValue,
                    updated_by: requestedBy,
                    updated_at: db.fn.now()
                })
                .returning('*');

            return asset || null;
        } catch (error) {
            if (error.code === '23505') throw new AppError('Asset update failed', 409, 'ASSET_UPDATE_FAILED');
            throw error;
        }
========
  async assetUpdate(data) {
    try {
      const { id, color, size, owner, appraisedValue, requestedBy } = data;

      const [asset] = await db("asset_registry")
        .where({ id })
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
>>>>>>>> jed:backend/dao/assetRegistryDao.js
    }
  }

<<<<<<<< HEAD:backend/dao/chaincodeMetadata/assetRegistryDao.js
    async assetDelete(data) {
        try {

            const { id, tenantId } = data;

            const deletedRows = await db('asset_registry')
                .where({ asset_id: id, tenant_id: tenantId })
                .del();
========
  async assetDelete(data) {
    try {
      const { id } = data;

      const deletedRows = await db("asset_registry").where({ id }).del();
>>>>>>>> jed:backend/dao/assetRegistryDao.js

      return deletedRows > 0;
    } catch (error) {
      throw error;
    }
  }

<<<<<<<< HEAD:backend/dao/chaincodeMetadata/assetRegistryDao.js
    async assetRead(data) {
        try {

            const { id, tenantId } = data;

            const asset = await db('asset_registry')
                .select('*')
                .where({ asset_id: id, tenant_id: tenantId })
                .first();
========
  async assetRead(data) {
    try {
      const { id } = data;

      const asset = await db("asset_registry")
        .select("*")
        .where({ id })
        .first();
>>>>>>>> jed:backend/dao/assetRegistryDao.js

      return asset || null;
    } catch (error) {
      throw error;
    }
  }

<<<<<<<< HEAD:backend/dao/chaincodeMetadata/assetRegistryDao.js
    async assetReadAll(data) {
        try {
            const assets = await db('asset_registry')
                .select('*')
                .where({ tenant_id: data.tenantId })
                .orderBy('created_at', 'desc');
========
  async assetReadAll(data) {
    try {
      const assets = await db("asset_registry")
        .select("*")
        .orderBy("created_at", "desc");
>>>>>>>> jed:backend/dao/assetRegistryDao.js

      return assets;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AssetRegistryDao();
