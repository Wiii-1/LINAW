/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  await knex.schema.createTable('tenants', (table) => {
    table.uuid('tenant_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('tenant_name', 255).notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('users', (table) => {
    table.uuid('user_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable();
    table.string('user_email', 255).notNullable();
    table.string('username', 255).notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.foreign('tenant_id').references('tenant_id').inTable('tenants').onDelete('CASCADE');
    table.unique(['tenant_id', 'user_email']);
    table.unique(['tenant_id', 'username']);
    table.index(['tenant_id']);
  });

  await knex.schema.createTable('organizations', (table) => {
    table.uuid('organization_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable();
    table.string('organization_name', 255).notNullable();
    table.string('msp_id', 255).nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.foreign('tenant_id').references('tenant_id').inTable('tenants').onDelete('CASCADE');
    table.unique(['tenant_id', 'organization_name']);
    table.index(['tenant_id']);
  });

  await knex.schema.createTable('organization_users', (table) => {
    table.uuid('tenant_id').notNullable();
    table.uuid('organization_id').notNullable();
    table.uuid('user_id').notNullable();
    table.string('role', 100).notNullable();

    table.primary(['organization_id', 'user_id']);
    table.foreign('tenant_id').references('tenant_id').inTable('tenants').onDelete('CASCADE');
    table.foreign('organization_id').references('organization_id').inTable('organizations').onDelete('CASCADE');
    table.foreign('user_id').references('user_id').inTable('users').onDelete('CASCADE');

    table.index(['tenant_id']);
    table.index(['user_id']);
  });

  await knex.schema.createTable('blockchain_network', (table) => {
    table.increments('network_id').primary();
    table.uuid('tenant_id').notNullable();
    table.string('network_name', 255).notNullable();
    table.uuid('created_by').nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.foreign('tenant_id').references('tenant_id').inTable('tenants').onDelete('CASCADE');
    table.foreign('created_by').references('user_id').inTable('users').onDelete('SET NULL');

    table.unique(['tenant_id', 'network_name']);
    table.index(['tenant_id']);
  });

  await knex.schema.createTable('channel', (table) => {
    table.string('channel_id', 255).primary();
    table.uuid('tenant_id').notNullable();
    table.integer('network_id').unsigned().notNullable();
    table.string('channel_name', 255).notNullable();
    table.uuid('created_by').nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.foreign('tenant_id').references('tenant_id').inTable('tenants').onDelete('CASCADE');
    table.foreign('network_id').references('network_id').inTable('blockchain_network').onDelete('CASCADE');
    table.foreign('created_by').references('user_id').inTable('users').onDelete('SET NULL');

    table.unique(['tenant_id', 'channel_name']);
    table.index(['tenant_id']);
    table.index(['network_id']);
  });

  await knex.schema.createTable('submissions', (table) => {
    table.bigIncrements('submission_id').primary();
    table.uuid('tenant_id').notNullable();
    table.uuid('owner').notNullable();
    table.text('object_key').notNullable();
    table.string('doc_hash', 64).notNullable();
    table.text('original_file_name').notNullable();
    table.string('mime_type', 255).notNullable();
    table.bigInteger('size').notNullable();

    table.foreign('tenant_id').references('tenant_id').inTable('tenants').onDelete('CASCADE');
    table.foreign('owner').references('user_id').inTable('users').onDelete('CASCADE');

    table.index(['tenant_id']);
    table.index(['owner']);
    table.index(['doc_hash']);
  });

  await knex.schema.createTable('asset_registry', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('tenant_id').notNullable();
    table.string('color', 100).nullable();
    table.bigInteger('size').nullable();
    table.uuid('owner').nullable();
    table.bigInteger('appraised_value').nullable();
    table.uuid('created_by').nullable();
    table.uuid('updated_by').nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.foreign('tenant_id').references('tenant_id').inTable('tenants').onDelete('CASCADE');
    table.foreign('owner').references('user_id').inTable('users').onDelete('SET NULL');
    table.foreign('created_by').references('user_id').inTable('users').onDelete('SET NULL');
    table.foreign('updated_by').references('user_id').inTable('users').onDelete('SET NULL');

    table.index(['tenant_id']);
    table.index(['owner']);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('asset_registry');
  await knex.schema.dropTableIfExists('submissions');
  await knex.schema.dropTableIfExists('channel');
  await knex.schema.dropTableIfExists('blockchain_network');
  await knex.schema.dropTableIfExists('organization_users');
  await knex.schema.dropTableIfExists('organizations');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('tenants');
};