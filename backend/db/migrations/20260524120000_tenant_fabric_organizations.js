/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable('tenant_fabric_organizations', (table) => {
    table.uuid('fabric_org_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable();
    table
      .enu('org_type', ['peer', 'orderer'], {
        useNative: true,
        enumName: 'tenant_fabric_org_type',
      })
      .notNullable();
    table.string('organization_name', 255).notNullable();
    table.string('msp_id', 128).notNullable();
    table.string('domain', 255).notNullable();
    table.integer('peer_port').unsigned().nullable();
    table.integer('chaincode_port').unsigned().nullable();
    table.integer('couchdb_port').unsigned().nullable();
    table.integer('orderer_port').unsigned().nullable();
    table.integer('orderer_admin_port').unsigned().nullable();
    table.integer('operations_port').unsigned().nullable();
    table.string('admin_user', 128).notNullable();
    table.text('admin_password_enc').notNullable();
    table
      .enu('status', ['initializing', 'ready', 'error'], {
        useNative: true,
        enumName: 'tenant_fabric_org_status',
      })
      .notNullable()
      .defaultTo('initializing');
    table.text('error_message').nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.foreign('tenant_id').references('tenant_id').inTable('tenants').onDelete('CASCADE');
    table.unique(['tenant_id', 'org_type']);
    table.index(['tenant_id']);
    table.index(['status']);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('tenant_fabric_organizations');
  await knex.raw('DROP TYPE IF EXISTS tenant_fabric_org_type');
  await knex.raw('DROP TYPE IF EXISTS tenant_fabric_org_status');
};
