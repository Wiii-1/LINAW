const knex = require('knex')
const knexfile = require('./knexfile')

const db = knex({
    client: 'pg',
    connection: process.env.DATABASE_NEON_URL,
    pool: {
        min: 2,
        max: 10
    },
})

module.exports = db