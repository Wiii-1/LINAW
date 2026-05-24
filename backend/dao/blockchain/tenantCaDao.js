const db = require('../db/db');

const TABLE = 'tenant_ca_deployments';

class TenantCaDao {
  async findByTenantId(tenant_id) {
    const row = await db(TABLE).where({ tenant_id }).first();
    return row || null;
  }

  async listByTenantId(tenant_id) {
    if (!tenant_id) return [];
    return db(TABLE).where({ tenant_id }).orderBy('created_at', 'desc');
  }

  async listAllTenantIds() {
    const rows = await db(TABLE).select('tenant_id');
    return rows.map((r) => r.tenant_id);
  }

  async listReservedPorts() {
    const rows = await db(TABLE).select(
      'tls_ca_port',
      'org_ca_port',
      'tls_ca_ops_port',
      'org_ca_ops_port',
    );
    const ports = [];
    for (const row of rows) {
      if (row.tls_ca_port != null) ports.push(row.tls_ca_port);
      if (row.org_ca_port != null) ports.push(row.org_ca_port);
      if (row.tls_ca_ops_port != null) ports.push(row.tls_ca_ops_port);
      if (row.org_ca_ops_port != null) ports.push(row.org_ca_ops_port);
    }
    return ports;
  }

  async create(data) {
    const [row] = await db(TABLE)
      .insert({
        tenant_id: data.tenant_id,
        created_by: data.created_by,
        tenant_name: data.tenant_name,
        tls_ca_name: data.tls_ca_name,
        org_ca_name: data.org_ca_name,
        tls_admin_user: data.tls_admin_user,
        tls_admin_password_enc: data.tls_admin_password_enc,
        org_admin_user: data.org_admin_user,
        org_admin_password_enc: data.org_admin_password_enc,
        status: data.status || 'initializing',
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning('*');
    return row;
  }

  async updateByTenantId(tenant_id, updateData) {
    const [row] = await db(TABLE)
      .where({ tenant_id })
      .update({
        ...updateData,
        updated_at: db.fn.now(),
      })
      .returning('*');
    return row || null;
  }

  async deleteByTenantId(tenant_id) {
    const deleted = await db(TABLE).where({ tenant_id }).del();
    return deleted > 0;
  }
}

module.exports = new TenantCaDao();
