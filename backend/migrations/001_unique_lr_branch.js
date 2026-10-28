const { Pool } = require('pg');

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log('🏃 Running migration: UNIQUE(lr_no, branch_code)...');

  try {
    // 1. Drop existing UNIQUE constraint or index on lr_no
    await pool.query(`
      ALTER TABLE consignments 
      DROP CONSTRAINT IF EXISTS consignments_lr_no_key,
      DROP CONSTRAINT IF EXISTS consignments_lr_no_branch_code_key;
    `);

    await pool.query(`
      DROP INDEX IF EXISTS idx_consignments_lr_no_unique;
    `);

    // 2. Add new UNIQUE constraint on (lr_no, branch_code)
    await pool.query(`
      ALTER TABLE consignments
      ADD CONSTRAINT consignments_lr_no_branch_code_key UNIQUE (lr_no, branch_code);
    `);

    console.log('✅ Successfully updated consignments constraint to UNIQUE(lr_no, branch_code)');
  } catch (err) {
    console.error('❌ Migration error:', err.message);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  migrate();
}

module.exports = { migrate };
