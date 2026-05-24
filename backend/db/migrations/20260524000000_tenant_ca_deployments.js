/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable('tenant_ca_deployments', (table) => {
    table.uuid('deployment_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().unique();
    table.uuid('created_by').notNullable();
    table.string('tenant_name', 255).notNullable();
    table.string('tls_ca_name', 128).notNullable();
    table.string('org_ca_name', 128).notNullable();
    table.integer('tls_ca_port').unsigned().nullable();
    table.integer('org_ca_port').unsigned().nullable();
    table.integer('tls_ca_ops_port').unsigned().nullable();
    table.integer('org_ca_ops_port').unsigned().nullable();
    table.string('tls_admin_user', 128).notNullable();
    table.text('tls_admin_password_enc').notNullable();
    table.string('org_admin_user', 128).notNullable();
    table.text('org_admin_password_enc').notNullable();
    table
      .enu('status', ['initializing', 'ready', 'error'], {
        useNative: true,
        enumName: 'tenant_ca_deployment_status',
      })
      .notNullable()
      .defaultTo('initializing');
    table.text('error_message').nullable();
    table.boolean('tls_cert_available').notNullable().defaultTo(false);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.foreign('tenant_id').references('tenant_id').inTable('tenants').onDelete('CASCADE');
    table.foreign('created_by').references('user_id').inTable('users').onDelete('CASCADE');
    table.index(['status']);
    table.index(['created_by']);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('tenant_ca_deployments');
  await knex.raw('DROP TYPE IF EXISTS tenant_ca_deployment_status');
};
