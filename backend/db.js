const { Pool } = require('pg');
const getDatabaseUrl = require('./database-url');

function getDb(env = process.env) {
  const connectionString = getDatabaseUrl(env);
  if (!connectionString) {
    console.error('DB connect failed, using local fallback');
    return null;
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: env.VERCEL ? 3 : 20,
    connectionTimeoutMillis: 10000,
  });
  pool.on('error', (error) => {
    console.error('DB connect failed, using local fallback:', error.message);
  });
  return pool;
}

module.exports = getDb;
