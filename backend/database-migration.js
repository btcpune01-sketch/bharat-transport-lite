const { Pool } = require('pg');

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log('🔄 Running database migrations...');

  try {
    await pool.query(`
      ALTER TABLE branches
      ADD COLUMN IF NOT EXISTS branch_login_enabled BOOLEAN DEFAULT FALSE
    `);
    await pool.query(`
      ALTER TABLE branches
      ADD COLUMN IF NOT EXISTS login_credentials JSONB
    `);
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email VARCHAR(100)
    `);
    console.log('✅ Added branch login schema columns');

    // Add consignor_email column
    await pool.query(`
      ALTER TABLE consignments 
      ADD COLUMN IF NOT EXISTS consignor_email VARCHAR(255)
    `);
    console.log('✅ Added consignor_email column');

    // Add consignee_email column
    await pool.query(`
      ALTER TABLE consignments 
      ADD COLUMN IF NOT EXISTS consignee_email VARCHAR(255)
    `);
    console.log('✅ Added consignee_email column');

    // Gate Pass Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gate_passes (
        id SERIAL PRIMARY KEY,
        pass_no VARCHAR(50) UNIQUE NOT NULL,
        lr_no VARCHAR(50),
        vehicle_no VARCHAR(20),
        driver_name VARCHAR(100),
        driver_mobile VARCHAR(15),
        material_desc TEXT,
        quantity VARCHAR(50),
        weight VARCHAR(20),
        valid_until DATE,
        issued_by VARCHAR(100),
        issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'Active',
        qr_code TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Gate passes table created');
        // Add new columns to gadi_challans table
    await pool.query(`ALTER TABLE gadi_challans ADD COLUMN IF NOT EXISTS packages VARCHAR(20)`);
    await pool.query(`ALTER TABLE gadi_challans ADD COLUMN IF NOT EXISTS bilty_date DATE`);
    await pool.query(`ALTER TABLE gadi_challans ADD COLUMN IF NOT EXISTS consignor_name VARCHAR(100)`);
    await pool.query(`ALTER TABLE gadi_challans ADD COLUMN IF NOT EXISTS consignee_name VARCHAR(100)`);
    console.log('✅ Added bilty detail columns to gadi_challans');
        // Add new columns to gadi_challans table
    await pool.query(`ALTER TABLE gadi_challans ADD COLUMN IF NOT EXISTS packages VARCHAR(20)`);
    await pool.query(`ALTER TABLE gadi_challans ADD COLUMN IF NOT EXISTS bilty_date DATE`);
    await pool.query(`ALTER TABLE gadi_challans ADD COLUMN IF NOT EXISTS consignor_name VARCHAR(100)`);
    await pool.query(`ALTER TABLE gadi_challans ADD COLUMN IF NOT EXISTS consignee_name VARCHAR(100)`);
    console.log('✅ Added bilty detail columns to gadi_challans');

        // Gadi Challan (Vehicle Freight Receipt) Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gadi_challans (
        id SERIAL PRIMARY KEY,
        challan_no VARCHAR(50) UNIQUE NOT NULL,
        lr_no VARCHAR(50),
        vehicle_no VARCHAR(20),
        driver_name VARCHAR(100),
        driver_mobile VARCHAR(15),
        driver_license VARCHAR(30),
        owner_name VARCHAR(100),
        owner_mobile VARCHAR(15),
        broker_name VARCHAR(100),
        broker_mobile VARCHAR(15),
        broker_commission DECIMAL(10,2) DEFAULT 0,
        from_place VARCHAR(100),
        to_place VARCHAR(100),
        material_desc TEXT,
        weight VARCHAR(20),
        freight_amount DECIMAL(10,2) DEFAULT 0,
        advance_paid DECIMAL(10,2) DEFAULT 0,
        balance_due DECIMAL(10,2) DEFAULT 0,
        toll_expense DECIMAL(10,2) DEFAULT 0,
        diesel_expense DECIMAL(10,2) DEFAULT 0,
        other_expense DECIMAL(10,2) DEFAULT 0,
        tds_deduction DECIMAL(10,2) DEFAULT 0,
        net_payable DECIMAL(10,2) DEFAULT 0,
        issue_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Gadi challans table created');
    console.log('✅ All migrations completed successfully!');
  } catch (err) {
    console.error('❌ Migration error:', err.message);
  } finally {
    await pool.end();
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
