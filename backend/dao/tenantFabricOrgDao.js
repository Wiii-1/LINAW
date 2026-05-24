const db = require('../db/db');

const TABLE = 'tenant_fabric_organizations';

class TenantFabricOrgDao {
  async findByTenantAndType(tenant_id, org_type) {
    const row = await db(TABLE).where({ tenant_id, org_type }).first();
    return row || null;
  }

  async listByTenantId(tenant_id) {
    if (!tenant_id) return [];
    return db(TABLE).where({ tenant_id }).orderBy('created_at', 'asc');
  }

  async listReservedPorts() {
    const rows = await db(TABLE).select(
      'peer_port',
      'chaincode_port',
      'couchdb_port',
      'orderer_port',
      'orderer_admin_port',
      'operations_port',
    );
    const ports = [];
    for (const row of rows) {
      if (row.peer_port != null) ports.push(row.peer_port);
      if (row.chaincode_port != null) ports.push(row.chaincode_port);
      if (row.couchdb_port != null) ports.push(row.couchdb_port);
      if (row.orderer_port != null) ports.push(row.orderer_port);
      if (row.orderer_admin_port != null) ports.push(row.orderer_admin_port);
      if (row.operations_port != null) ports.push(row.operations_port);
    }
    return ports;
  }

  async create(data) {
    const [row] = await db(TABLE)
      .insert({
        tenant_id: data.tenant_id,
        org_type: data.org_type,
        organization_name: data.organization_name,
        msp_id: data.msp_id,
        domain: data.domain,
        peer_port: data.peer_port ?? null,
        chaincode_port: data.chaincode_port ?? null,
        couchdb_port: data.couchdb_port ?? null,
        orderer_port: data.orderer_port ?? null,
        orderer_admin_port: data.orderer_admin_port ?? null,
        operations_port: data.operations_port ?? null,
        admin_user: data.admin_user,
        admin_password_enc: data.admin_password_enc,
        status: data.status || 'initializing',
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning('*');
    return row;
  }

  async updateById(fabric_org_id, updateData) {
    const [row] = await db(TABLE)
      .where({ fabric_org_id })
      .update({
        ...updateData,
        updated_at: db.fn.now(),
      })
      .returning('*');
    return row || null;
  }

  async deleteByTenantAndType(tenant_id, org_type) {
    const deleted = await db(TABLE).where({ tenant_id, org_type }).del();
    return deleted > 0;
  }

  async deleteByTenantId(tenant_id) {
    return db(TABLE).where({ tenant_id }).del();
  }
}

module.exports = new TenantFabricOrgDao();
