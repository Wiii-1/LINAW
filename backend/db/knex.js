const knex = require('knex');
const knexfile = require('./knexfile');
const env = process.env.NODE_ENV || 'development';

const config = knexfile[env];

const db = knex(config);

const connectStartedAt = Date.now();

db.raw('SELECT 1')
  .then(() => {
    // #region agent log
    fetch('http://127.0.0.1:7877/ingest/f1a5f444-be82-4ef3-84a1-4f6036d8fa32',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1ea95b'},body:JSON.stringify({sessionId:'1ea95b',runId:'pre-fix',hypothesisId:'H2,H4',location:'knex.js:connect-ok',message:'knex health check succeeded',data:{elapsedMs:Date.now()-connectStartedAt,nodeEnv:env},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    console.log('✅ Connected to Postgres SQL');
  })
  .catch((err) => {
    const nested = err?.errors?.map((e) => ({
      code: e.code,
      address: e.address,
      port: e.port,
    }));
    // #region agent log
    fetch('http://127.0.0.1:7877/ingest/f1a5f444-be82-4ef3-84a1-4f6036d8fa32',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1ea95b'},body:JSON.stringify({sessionId:'1ea95b',runId:'pre-fix',hypothesisId:'H2,H3,H4',location:'knex.js:connect-fail',message:'knex health check failed',data:{elapsedMs:Date.now()-connectStartedAt,nodeEnv:env,errCode:err?.code,errMessage:err?.message,nestedErrors:nested},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    console.error('❌ DB connection failed:', err);
  });

module.exports = db;