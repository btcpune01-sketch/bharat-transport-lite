const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const createBranchAuthRouter = require('./routes/branchAuth');
const createBranchAccessMiddleware = require('./middleware/branchAccess');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';
app.set('trust proxy', 1);

// ✅ CORS - PERMANENT FIX
app.use(cors({
  origin: [
    'https://bharat-transport-company.vercel.app',
    'https://bharat-transport.pages.dev',
    'https://bharat-transport-v2.pages.dev',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:4173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Branch-Slug']
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is missing!');
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET is missing!');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
});
const branchAccessMiddleware = createBranchAccessMiddleware(pool);

app.use('/api/branch-login', createBranchAuthRouter(pool));

// ==========================================
// SAFE MIGRATION
// ==========================================
async function addColumnIfNotExists(table, column, definition) {
  try {
    const check = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = $1 AND column_name = $2`,
      [table, column]
    );
    if (check.rows.length === 0) {
      await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${definition}`);
      console.log(`  ✅ Added column "${column}" to "${table}"`);
    }
  } catch (err) {
    console.error(`  ⚠️ Error adding ${column} to ${table}:`, err.message);
    throw err;
  }
}

async function widenColumnToText(table, column) {
  try {
    const result = await pool.query(
      `SELECT data_type
       FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = $1 AND column_name = $2`,
      [table, column]
    );
    if (result.rows.length === 0 || result.rows[0].data_type === 'text') return;
    await pool.query(`ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE TEXT`);
    console.log(`  ✅ Widened ${table}.${column} to TEXT`);
  } catch (err) {
    console.error(`  ⚠️ Unable to widen ${table}.${column} to TEXT:`, err.message);
  }
}

async function runMigrations() {
  console.log('🏃 Running database migrations...');
  const tables = [
    `CREATE TABLE IF NOT EXISTS branches (id SERIAL PRIMARY KEY, branch_code TEXT UNIQUE NOT NULL, branch_name TEXT NOT NULL, address TEXT, city TEXT, state TEXT, pincode TEXT, phone TEXT, email TEXT, gst_no TEXT, pan_no TEXT, manager_name TEXT, manager_phone TEXT, branch_login_enabled BOOLEAN DEFAULT FALSE, login_credentials JSONB, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, email TEXT, full_name TEXT, role TEXT DEFAULT 'operator', branch_id INTEGER, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS parties (id SERIAL PRIMARY KEY, party_code TEXT UNIQUE NOT NULL, party_name TEXT NOT NULL, party_type TEXT DEFAULT 'Consignor', address TEXT, city TEXT, state TEXT, pincode TEXT, gst_no TEXT, pan_no TEXT, email TEXT, phone TEXT, mobile TEXT, contact_person TEXT, credit_days INTEGER DEFAULT 0, opening_balance NUMERIC DEFAULT 0, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS customers (id SERIAL PRIMARY KEY, customer_name TEXT NOT NULL, customer_code TEXT UNIQUE, address TEXT, gst_no TEXT, email TEXT, phone TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS drivers (id SERIAL PRIMARY KEY, driver_code TEXT UNIQUE NOT NULL, driver_name TEXT NOT NULL, father_name TEXT, aadhar_no TEXT, license_no TEXT, license_expiry DATE, phone TEXT, address TEXT, photo_url TEXT, joining_date DATE, status TEXT DEFAULT 'Active', created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS vehicles (id SERIAL PRIMARY KEY, vehicle_no TEXT UNIQUE NOT NULL, vehicle_type TEXT, owner_name TEXT, owner_phone TEXT, rc_expiry DATE, insurance_expiry DATE, fitness_expiry DATE, permit_expiry DATE, puc_expiry DATE, status TEXT DEFAULT 'Active', created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS freight_rates (id SERIAL PRIMARY KEY, from_city TEXT NOT NULL, to_city TEXT NOT NULL, material TEXT, rate_per_kg NUMERIC, rate_per_pkg NUMERIC, min_charge NUMERIC, distance_km NUMERIC, effective_from DATE, effective_to DATE, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS materials (id SERIAL PRIMARY KEY, material_name TEXT UNIQUE NOT NULL, material_code TEXT, hsn_code TEXT, category TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS routes (id SERIAL PRIMARY KEY, from_city TEXT NOT NULL, to_city TEXT NOT NULL, distance_km NUMERIC, via TEXT, estimated_days INTEGER, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS consignments (id SERIAL PRIMARY KEY, lr_no TEXT UNIQUE NOT NULL, lr_date DATE, branch_id INTEGER, branch_code TEXT, from_name TEXT, to_name TEXT, consignor_code TEXT, consignor_name TEXT, consignor_address TEXT, consignor_gst TEXT, consignee_code TEXT, consignee_name TEXT, consignee_address TEXT, consignee_gst TEXT, invoice_no TEXT, invoice_date TEXT, po_no TEXT, lorry_no TEXT, driver_name TEXT, driver_mobile TEXT, delivery_type TEXT DEFAULT 'DOOR DELIVERY', packages TEXT, no_of_packages TEXT, method_of_packing TEXT, hsn_code TEXT, actual_weight TEXT, charged_weight TEXT, material_desc TEXT, description TEXT, eway_bill_no TEXT, length TEXT, width TEXT, height TEXT, total_cft TEXT, cft_cmt TEXT, declared_value TEXT, basis_party TEXT, basis_booking TEXT DEFAULT 'TO PAY', rv_no TEXT, rv_dt TEXT, rv_am TEXT, insurance_company TEXT, policy_no TEXT, insurance_amount TEXT, freight TEXT, aoc_percent TEXT, material_mgmt_ch TEXT, material_charges TEXT, collection_charges TEXT, door_dly_charges TEXT, door_delivery TEXT, misc_charges TEXT, grand_total TEXT, status TEXT DEFAULT 'Booked', payment_status TEXT DEFAULT 'Unpaid', mr_no TEXT, pod_status TEXT DEFAULT 'Pending', pod_date DATE, pod_remarks TEXT, from_state TEXT, to_state TEXT, transporter_id TEXT, transporter_name TEXT, eway_valid_upto DATE, created_by TEXT, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS pod_records (id SERIAL PRIMARY KEY, lr_no TEXT NOT NULL, branch_id INTEGER, delivery_date DATE, delivered_by TEXT, receiver_name TEXT, receiver_signature TEXT, receiver_phone TEXT, delivery_remarks TEXT, photo_url TEXT, status TEXT DEFAULT 'Delivered', created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS bill_book (id SERIAL PRIMARY KEY, bill_no TEXT UNIQUE, bill_date DATE, branch_id INTEGER, party_name TEXT, party_code TEXT, party_gst TEXT, party_address TEXT, from_name TEXT, to_name TEXT, consignor_name TEXT, consignee_name TEXT, vehicle_no TEXT, lr_nos TEXT, amount TEXT, gst_amount TEXT, total_amount TEXT, grand_total NUMERIC DEFAULT 0, advance_received NUMERIC DEFAULT 0, balance_due NUMERIC DEFAULT 0, net_balance NUMERIC DEFAULT 0, trip_subtotal NUMERIC DEFAULT 0, gst_percent NUMERIC DEFAULT 0, invoice_no TEXT, invoice_date DATE, amount_in_words TEXT, payment_mode TEXT, payment_details TEXT, remarks TEXT, status TEXT DEFAULT 'Pending', payment_status TEXT DEFAULT 'Unpaid', mr_no TEXT, branch_code TEXT, customer_id INTEGER, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS bill_items (id SERIAL PRIMARY KEY, bill_id INTEGER REFERENCES bill_book(id) ON DELETE CASCADE, lr_no TEXT, invoice_no TEXT, from_name TEXT, to_name TEXT, weight_mt NUMERIC DEFAULT 0, packages INTEGER DEFAULT 0, freight NUMERIC DEFAULT 0, loading NUMERIC DEFAULT 0, unloading NUMERIC DEFAULT 0, other_charges NUMERIC DEFAULT 0, total NUMERIC DEFAULT 0, created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS money_receipts (id SERIAL PRIMARY KEY, mr_no TEXT UNIQUE NOT NULL, mr_date DATE NOT NULL, branch_id INTEGER, party_type TEXT NOT NULL, party_name TEXT NOT NULL, bilty_id INTEGER, bilty_lr_no TEXT, bill_id INTEGER, bill_no TEXT, amount NUMERIC NOT NULL, payment_mode TEXT DEFAULT 'Cash', is_advance BOOLEAN DEFAULT FALSE, remarks TEXT, created_by TEXT, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS party_ledger (id SERIAL PRIMARY KEY, party_code TEXT NOT NULL, branch_id INTEGER, transaction_date DATE, transaction_type TEXT, reference_no TEXT, debit NUMERIC DEFAULT 0, credit NUMERIC DEFAULT 0, balance NUMERIC DEFAULT 0, remarks TEXT, created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS expenses (id SERIAL PRIMARY KEY, expense_date DATE, branch_id INTEGER, category TEXT, description TEXT, amount NUMERIC, payment_mode TEXT, bill_no TEXT, approved_by TEXT, created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS claims (id SERIAL PRIMARY KEY, lr_no TEXT, branch_id INTEGER, claim_date DATE, claim_type TEXT, description TEXT, claim_amount NUMERIC, settled_amount NUMERIC, status TEXT DEFAULT 'Open', remarks TEXT, created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS commissions (id SERIAL PRIMARY KEY, lr_no TEXT, branch_id INTEGER, agent_name TEXT, commission_percent NUMERIC, commission_amount NUMERIC, status TEXT DEFAULT 'Pending', paid_date DATE, created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY, lr_no TEXT, party_name TEXT, phone TEXT, email TEXT, message TEXT, type TEXT, status TEXT DEFAULT 'Pending', sent_at TIMESTAMP, created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS audit_logs (id SERIAL PRIMARY KEY, action TEXT NOT NULL, module TEXT NOT NULL, record_id TEXT, details TEXT, performed_by TEXT, branch_id INTEGER, created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS gate_passes (id SERIAL PRIMARY KEY, pass_no TEXT UNIQUE NOT NULL, branch_id INTEGER, lr_no TEXT, vehicle_no TEXT, driver_name TEXT, driver_mobile TEXT, material_desc TEXT, quantity TEXT, weight TEXT, valid_until DATE, issued_by TEXT, qr_code TEXT, created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS gadi_challans (id SERIAL PRIMARY KEY, challan_no TEXT UNIQUE NOT NULL, branch_id INTEGER, lr_no TEXT, vehicle_no TEXT, driver_name TEXT, driver_mobile TEXT, driver_license TEXT, owner_name TEXT, owner_mobile TEXT, broker_name TEXT, broker_mobile TEXT, broker_commission TEXT, from_place TEXT, to_place TEXT, material_desc TEXT, weight TEXT, packages TEXT, bilty_date DATE, consignor_name TEXT, consignee_name TEXT, freight_amount NUMERIC, advance_paid NUMERIC, balance_due NUMERIC, toll_expense NUMERIC, diesel_expense NUMERIC, other_expense NUMERIC, tds_deduction NUMERIC, net_payable NUMERIC, issue_date DATE, created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS document_stock (id SERIAL PRIMARY KEY, document_type TEXT UNIQUE NOT NULL, total_stock INTEGER DEFAULT 0, used_count INTEGER DEFAULT 0, last_updated TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS trips (id SERIAL PRIMARY KEY, trip_no TEXT UNIQUE NOT NULL, trip_date DATE, branch_id INTEGER, vehicle_no TEXT, driver_name TEXT, driver_mobile TEXT, from_branch TEXT, to_branch TEXT, via_hub TEXT, expected_departure DATE, expected_arrival DATE, distance_km NUMERIC, estimated_days INTEGER, status TEXT DEFAULT 'Planning', remarks TEXT, created_by TEXT, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS rate_contracts (id SERIAL PRIMARY KEY, branch_id INTEGER, party_code TEXT, from_city TEXT NOT NULL, to_city TEXT NOT NULL, rate_type TEXT DEFAULT 'per_kg', rate_per_kg NUMERIC, rate_per_pkg NUMERIC, fixed_rate NUMERIC, min_charge NUMERIC, weight_from NUMERIC, weight_to NUMERIC, effective_from DATE NOT NULL, effective_to DATE, is_active BOOLEAN DEFAULT TRUE, remarks TEXT, created_by TEXT, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())`
  ];

  for (const sql of tables) {
    try { await pool.query(sql); } catch (err) { console.error('Table error:', err.message); }
  }

  await pool.query(`CREATE TABLE IF NOT EXISTS manifests (id SERIAL PRIMARY KEY, manifest_no TEXT UNIQUE NOT NULL, manifest_date DATE NOT NULL, branch_id INTEGER, from_branch TEXT, to_branch TEXT, vehicle_no TEXT, driver_name TEXT, driver_mobile TEXT, status TEXT DEFAULT 'Created', remarks TEXT, created_by TEXT, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS manifest_items (id SERIAL PRIMARY KEY, manifest_id INTEGER REFERENCES manifests(id) ON DELETE CASCADE, lr_no TEXT NOT NULL, branch_id INTEGER, created_at TIMESTAMP DEFAULT NOW())`);
  await pool.query(`
    INSERT INTO document_stock (document_type, total_stock) VALUES
      ('bilty', 500), ('mr', 500), ('gadi_challan', 500),
      ('billing', 1500), ('gate_pass', 300), ('pod', 300)
    ON CONFLICT (document_type) DO NOTHING
  `);
  
  console.log('🔧 Adding missing columns...');
  await addColumnIfNotExists('branches', 'address', 'TEXT');
  await addColumnIfNotExists('branches', 'city', 'TEXT');
  await addColumnIfNotExists('branches', 'state', 'TEXT');
  await addColumnIfNotExists('branches', 'pincode', 'TEXT');
  await addColumnIfNotExists('branches', 'phone', 'TEXT');
  await addColumnIfNotExists('branches', 'email', 'TEXT');
  await addColumnIfNotExists('branches', 'gst_no', 'TEXT');
  await addColumnIfNotExists('branches', 'pan_no', 'TEXT');
  await addColumnIfNotExists('branches', 'manager_name', 'TEXT');
  await addColumnIfNotExists('branches', 'manager_phone', 'TEXT');
  await addColumnIfNotExists('branches', 'branch_login_enabled', 'BOOLEAN DEFAULT FALSE');
  await addColumnIfNotExists('branches', 'login_credentials', 'JSONB');
  await addColumnIfNotExists('branches', 'url_slug', 'TEXT');
  await addColumnIfNotExists('branches', 'incharge_name', 'TEXT');
  await addColumnIfNotExists('branches', 'incharge_username', 'TEXT');
  await addColumnIfNotExists('branches', 'incharge_password', 'TEXT');
  await addColumnIfNotExists('branches', 'is_active', 'BOOLEAN DEFAULT TRUE');
  await addColumnIfNotExists('users', 'branch_id', 'INTEGER');
  await addColumnIfNotExists('users', 'full_name', 'TEXT');
  await addColumnIfNotExists('users', 'role', "TEXT DEFAULT 'operator'");
  await addColumnIfNotExists('users', 'is_active', 'BOOLEAN DEFAULT TRUE');
  await addColumnIfNotExists('users', 'email', 'TEXT');
  await addColumnIfNotExists('parties', 'is_active', 'BOOLEAN DEFAULT TRUE');
  await addColumnIfNotExists('parties', 'party_type', "TEXT DEFAULT 'Consignor'");
  await addColumnIfNotExists('parties', 'city', 'TEXT');
  await addColumnIfNotExists('parties', 'state', 'TEXT');
  await addColumnIfNotExists('parties', 'pincode', 'TEXT');
  await addColumnIfNotExists('parties', 'pan_no', 'TEXT');
  await addColumnIfNotExists('parties', 'mobile', 'TEXT');
  await addColumnIfNotExists('parties', 'contact_person', 'TEXT');
  await addColumnIfNotExists('parties', 'credit_days', 'INTEGER DEFAULT 0');
  await addColumnIfNotExists('parties', 'opening_balance', 'NUMERIC DEFAULT 0');
  await addColumnIfNotExists('customers', 'is_active', 'BOOLEAN DEFAULT TRUE');
  await addColumnIfNotExists('customers', 'mobile', 'TEXT');
  await addColumnIfNotExists('customers', 'whatsapp', 'TEXT');
  await addColumnIfNotExists('customers', 'city', 'TEXT');
  await addColumnIfNotExists('customers', 'state', 'TEXT');
  await addColumnIfNotExists('customers', 'pincode', 'TEXT');
  await addColumnIfNotExists('customers', 'pan_no', 'TEXT');
  await addColumnIfNotExists('customers', 'customer_type', "TEXT DEFAULT 'Cash'");
  await addColumnIfNotExists('customers', 'credit_limit', 'NUMERIC DEFAULT 0');
  await addColumnIfNotExists('customers', 'credit_days', 'INTEGER DEFAULT 0');
  await addColumnIfNotExists('customers', 'opening_balance', 'NUMERIC DEFAULT 0');
  await addColumnIfNotExists('drivers', 'status', "TEXT DEFAULT 'Active'");
  await addColumnIfNotExists('drivers', 'phone', 'TEXT');
  await addColumnIfNotExists('vehicles', 'status', "TEXT DEFAULT 'Active'");
  await addColumnIfNotExists('money_receipts', 'branch_id', 'INTEGER');
  await addColumnIfNotExists('money_receipts', 'updated_at', 'TIMESTAMP DEFAULT NOW()');
  await addColumnIfNotExists('money_receipts', 'created_by', 'TEXT');
  await addColumnIfNotExists('consignments', 'branch_id', 'INTEGER');
  await addColumnIfNotExists('consignments', 'branch_code', 'TEXT');
  await addColumnIfNotExists('bill_book', 'branch_id', 'INTEGER');
  await addColumnIfNotExists('bill_book', 'branch_code', 'TEXT');
  await addColumnIfNotExists('consignments', 'pod_status', "TEXT DEFAULT 'Pending'");
  await addColumnIfNotExists('consignments', 'pod_date', 'DATE');
  await addColumnIfNotExists('consignments', 'pod_remarks', 'TEXT');
  await addColumnIfNotExists('consignments', 'updated_at', 'TIMESTAMP DEFAULT NOW()');
  await addColumnIfNotExists('consignments', 'payment_status', "TEXT DEFAULT 'Unpaid'");
  await addColumnIfNotExists('consignments', 'mr_active', 'BOOLEAN DEFAULT FALSE');
  await addColumnIfNotExists('consignments', 'mr_party_name', 'TEXT');
  await addColumnIfNotExists('consignments', 'mr_amount', 'NUMERIC DEFAULT 0');
  await addColumnIfNotExists('consignments', 'mr_payment_mode', 'TEXT');
  await addColumnIfNotExists('consignments', 'mr_remarks', 'TEXT');
  await addColumnIfNotExists('consignments', 'mr_date', 'DATE');
  await addColumnIfNotExists('consignments', 'mr_party_type', 'TEXT');
  await addColumnIfNotExists('consignments', 'mr_is_advance', 'BOOLEAN DEFAULT FALSE');
  await addColumnIfNotExists('consignments', 'mr_bilty_id', 'INTEGER');
  await addColumnIfNotExists('consignments', 'mr_bilty_lr_no', 'TEXT');
  await addColumnIfNotExists('consignments', 'mr_bill_id', 'INTEGER');
  await addColumnIfNotExists('consignments', 'mr_bill_no', 'TEXT');
  await addColumnIfNotExists('consignments', 'mr_created_by', 'TEXT');
  await addColumnIfNotExists('consignments', 'mr_no', 'TEXT');
  await addColumnIfNotExists('consignments', 'from_state', 'TEXT');
  await addColumnIfNotExists('consignments', 'to_state', 'TEXT');
  await addColumnIfNotExists('consignments', 'transporter_id', 'TEXT');
  await addColumnIfNotExists('consignments', 'transporter_name', 'TEXT');
  await addColumnIfNotExists('consignments', 'eway_valid_upto', 'DATE');
  await addColumnIfNotExists('consignments', 'no_of_packages', 'TEXT');
  await addColumnIfNotExists('consignments', 'package_count', 'INTEGER');
  await addColumnIfNotExists('consignments', 'actual_weight', 'TEXT');
  await addColumnIfNotExists('consignments', 'charged_weight', 'TEXT');
  await addColumnIfNotExists('consignments', 'length', 'TEXT');
  await addColumnIfNotExists('consignments', 'width', 'TEXT');
  await addColumnIfNotExists('consignments', 'height', 'TEXT');
  await addColumnIfNotExists('consignments', 'package_type', 'TEXT');
  await addColumnIfNotExists('consignments', 'no_of_pkgs_dimension', 'TEXT');
  await addColumnIfNotExists('consignments', 'total_cft', 'TEXT');
  await addColumnIfNotExists('consignments', 'description', 'TEXT');
  await addColumnIfNotExists('consignments', 'cft_cmt', 'TEXT');
  await addColumnIfNotExists('consignments', 'material_charges', 'TEXT');
  await addColumnIfNotExists('consignments', 'door_delivery', 'TEXT');
  await addColumnIfNotExists('consignments', 'from_code', 'TEXT');
  await addColumnIfNotExists('consignments', 'to_code', 'TEXT');
  await addColumnIfNotExists('consignments', 'unloading_party_mobile', 'TEXT');
  await addColumnIfNotExists('consignments', 'delivery_godown_address', 'TEXT');
  await addColumnIfNotExists('consignments', 'pickup_address', 'TEXT');
  await addColumnIfNotExists('consignments', 'consignor_mobile', 'TEXT');
  await addColumnIfNotExists('consignments', 'consignee_mobile', 'TEXT');
  await addColumnIfNotExists('consignments', 'po_date', 'TEXT');
  await addColumnIfNotExists('consignments', 'rate', 'TEXT');
  await addColumnIfNotExists('consignments', 'distance', 'TEXT');
  await addColumnIfNotExists('consignments', 'no_of_pkgs_dimension', 'TEXT');
  await addColumnIfNotExists('consignments', 'private_marks', 'TEXT');
  await addColumnIfNotExists('consignments', 'load_type', 'TEXT');
  await addColumnIfNotExists('consignments', 'aoc_amount', 'TEXT');
  await addColumnIfNotExists('consignments', 'eov_charges', 'TEXT');
  await addColumnIfNotExists('consignments', 'cover_charges', 'TEXT');
  await addColumnIfNotExists('consignments', 'pass_cc_charges', 'TEXT');
  await addColumnIfNotExists('consignments', 'enroute_charges', 'TEXT');
  await addColumnIfNotExists('consignments', 'statistical_charges', 'TEXT');
  await addColumnIfNotExists('consignments', 'billed_at', 'TEXT');
  await addColumnIfNotExists('consignments', 'billed_at_type', 'TEXT');
  await addColumnIfNotExists('consignments', 'gst_through', 'TEXT');
  await addColumnIfNotExists('consignments', 'amount_in_words', 'TEXT');
  await addColumnIfNotExists('consignments', 'insurance_status', 'TEXT');
  await addColumnIfNotExists('consignments', 'insurance_date', 'TEXT');
  await addColumnIfNotExists('consignments', 'third_party_name', 'TEXT');
  await addColumnIfNotExists('consignments', 'third_party_gst', 'TEXT');
  await addColumnIfNotExists('consignments', 'third_party_address', 'TEXT');
  await addColumnIfNotExists('consignments', 'third_party_gstin', 'TEXT');
  await addColumnIfNotExists('consignments', 'bill_to_party', 'TEXT');

  await pool.query(`
    UPDATE consignments c
    SET branch_id = b.id
    FROM branches b
    WHERE c.branch_id IS NULL
      AND c.branch_code IS NOT NULL
      AND UPPER(TRIM(c.branch_code)) = UPPER(TRIM(b.branch_code))
  `);
  await pool.query(`
    UPDATE bill_book bill
    SET branch_id = b.id
    FROM branches b
    WHERE bill.branch_id IS NULL
      AND bill.branch_code IS NOT NULL
      AND UPPER(TRIM(bill.branch_code)) = UPPER(TRIM(b.branch_code))
  `);
  await addColumnIfNotExists('consignments', 'basis_of_booking', 'TEXT');
  await addColumnIfNotExists('consignments', 'is_deleted', 'BOOLEAN DEFAULT FALSE');
  await addColumnIfNotExists('consignments', 'consignor_address', 'TEXT');
  await addColumnIfNotExists('consignments', 'consignee_address', 'TEXT');
  await addColumnIfNotExists('consignments', 'delivery_godown_address', 'TEXT');
  await addColumnIfNotExists('consignments', 'pickup_address', 'TEXT');
  await addColumnIfNotExists('consignments', 'from_name', 'TEXT');
  await addColumnIfNotExists('consignments', 'to_name', 'TEXT');
  await addColumnIfNotExists('consignments', 'description', 'TEXT');
  await addColumnIfNotExists('consignments', 'private_marks', 'TEXT');
  await addColumnIfNotExists('consignments', 'method_of_packing', 'TEXT');
  await addColumnIfNotExists('consignments', 'basis_booking', 'TEXT');
  await pool.query(`
    ALTER TABLE consignments
      ALTER COLUMN consignor_address TYPE TEXT,
      ALTER COLUMN consignee_address TYPE TEXT,
      ALTER COLUMN third_party_address TYPE TEXT,
      ALTER COLUMN description TYPE TEXT,
      ALTER COLUMN private_marks TYPE TEXT,
      ALTER COLUMN delivery_godown_address TYPE TEXT,
      ALTER COLUMN pickup_address TYPE TEXT,
      ALTER COLUMN from_name TYPE TEXT,
      ALTER COLUMN to_name TYPE TEXT,
      ALTER COLUMN basis_of_booking TYPE TEXT USING basis_of_booking::text,
      ALTER COLUMN basis_booking TYPE TEXT USING basis_booking::text,
      ALTER COLUMN method_of_packing TYPE TEXT
  `);
  await addColumnIfNotExists('consignments', 'mr_party_name', 'TEXT');
  await addColumnIfNotExists('consignments', 'mr_active', 'BOOLEAN DEFAULT false');
  await addColumnIfNotExists('consignments', 'mr_amount', 'NUMERIC DEFAULT 0');
  await addColumnIfNotExists('consignments', 'mr_payment_mode', 'TEXT');
  await addColumnIfNotExists('bill_book', 'branch_id', 'INTEGER');
  await addColumnIfNotExists('bill_book', 'updated_at', 'TIMESTAMP DEFAULT NOW()');
  await addColumnIfNotExists('bill_book', 'payment_status', "TEXT DEFAULT 'Unpaid'");
  await addColumnIfNotExists('bill_book', 'party_gst', 'TEXT');
  await addColumnIfNotExists('bill_book', 'party_address', 'TEXT');
  await addColumnIfNotExists('bill_book', 'from_name', 'TEXT');
  await addColumnIfNotExists('bill_book', 'to_name', 'TEXT');
  await addColumnIfNotExists('bill_book', 'consignor_name', 'TEXT');
  await addColumnIfNotExists('bill_book', 'consignee_name', 'TEXT');
  await addColumnIfNotExists('bill_book', 'vehicle_no', 'TEXT');
  await addColumnIfNotExists('bill_book', 'grand_total', 'NUMERIC DEFAULT 0');
  await addColumnIfNotExists('bill_book', 'advance_received', 'NUMERIC DEFAULT 0');
  await addColumnIfNotExists('bill_book', 'balance_due', 'NUMERIC DEFAULT 0');
  await addColumnIfNotExists('bill_book', 'net_balance', 'NUMERIC DEFAULT 0');
  await addColumnIfNotExists('bill_book', 'trip_subtotal', 'NUMERIC DEFAULT 0');
  await addColumnIfNotExists('bill_book', 'gst_percent', 'NUMERIC DEFAULT 0');
  await addColumnIfNotExists('bill_book', 'gst_amount', 'TEXT');
  await addColumnIfNotExists('bill_book', 'amount_in_words', 'TEXT');
  await addColumnIfNotExists('bill_book', 'payment_mode', 'TEXT');
  await addColumnIfNotExists('bill_book', 'payment_details', 'TEXT');
  await addColumnIfNotExists('bill_book', 'remarks', 'TEXT');
  await addColumnIfNotExists('bill_book', 'invoice_no', 'TEXT');
  await addColumnIfNotExists('bill_book', 'invoice_date', 'DATE');
  await addColumnIfNotExists('bill_book', 'branch_code', 'TEXT');
  await addColumnIfNotExists('bill_book', 'customer_id', 'INTEGER');
  await addColumnIfNotExists('bill_book', 'lr_nos', 'TEXT');
  await addColumnIfNotExists('bill_items', 'packages', 'INTEGER DEFAULT 0');
  await addColumnIfNotExists('bill_items', 'freight', 'NUMERIC DEFAULT 0');
  await addColumnIfNotExists('bill_items', 'trip_date', 'TEXT');
  await addColumnIfNotExists('party_ledger', 'branch_id', 'INTEGER');
  await addColumnIfNotExists('expenses', 'branch_id', 'INTEGER');
  await addColumnIfNotExists('claims', 'branch_id', 'INTEGER');
  await addColumnIfNotExists('commissions', 'branch_id', 'INTEGER');
  await addColumnIfNotExists('audit_logs', 'branch_id', 'INTEGER');
  await addColumnIfNotExists('gate_passes', 'branch_id', 'INTEGER');
  await addColumnIfNotExists('gadi_challans', 'branch_id', 'INTEGER');
  await addColumnIfNotExists('pod_records', 'branch_id', 'INTEGER');
  await addColumnIfNotExists('freight_rates', 'is_active', 'BOOLEAN DEFAULT TRUE');
  await addColumnIfNotExists('materials', 'is_active', 'BOOLEAN DEFAULT TRUE');
  await addColumnIfNotExists('routes', 'is_active', 'BOOLEAN DEFAULT TRUE');
  await addColumnIfNotExists('rate_contracts', 'is_active', 'BOOLEAN DEFAULT TRUE');
  await addColumnIfNotExists('trips', 'status', "TEXT DEFAULT 'Planning'");
  await addColumnIfNotExists('manifests', 'status', "TEXT DEFAULT 'Created'");

  const varcharColumns = [
    ['bills', 'bill_to_name'],
    ['bills', 'bill_to_gstin'],
    ['bills', 'consignor_name'],
    ['bills', 'consignor_address'],
    ['bills', 'consignee_name'],
    ['bills', 'consignee_address'],
    ['bills', 'vehicle_no'],
    ['bills', 'remarks'],
    ['bill_book', 'bill_to_name'],
    ['bill_book', 'bill_to_gstin'],
    ['bill_book', 'party_name'],
    ['bill_book', 'party_gst'],
    ['bill_book', 'party_address'],
    ['bill_book', 'consignor_name'],
    ['bill_book', 'consignee_name'],
    ['bill_book', 'consignor_address'],
    ['bill_book', 'consignee_address'],
    ['bill_book', 'from_name'],
    ['bill_book', 'to_name'],
    ['bill_book', 'vehicle_no'],
    ['bill_book', 'remarks'],
    ['bill_items', 'from_name'],
    ['bill_items', 'to_name'],
    ['consignments', 'consignor_address'],
    ['consignments', 'consignee_address'],
    ['consignments', 'from_name'],
    ['consignments', 'to_name'],
    ['consignments', 'delivery_godown'],
    ['consignments', 'delivery_godown_address'],
    ['consignments', 'pickup_address'],
    ['consignments', 'description'],
    ['consignments', 'private_marks']
  ];
  for (const [table, column] of varcharColumns) {
    await widenColumnToText(table, column);
  }

  console.log('✅ All migrations completed');
}

// ==========================================
// AUTH MIDDLEWARE
// ==========================================
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(authHeader.substring(7), process.env.JWT_SECRET);
    if (req.user.role === 'branch' || req.user.role === 'branch_user') return branchAccessMiddleware(req, res, next);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

async function logAudit(action, module, recordId, details, performedBy, branchId = null) {
  try {
    await pool.query(`INSERT INTO audit_logs (action, module, record_id, details, performed_by, branch_id) VALUES ($1,$2,$3,$4,$5,$6)`, [action, module, recordId, details, performedBy, branchId]);
  } catch (e) { console.error('Audit error:', e.message); }
}

// ==========================================
// ROOT & AUTH
// ==========================================
app.get('/', (req, res) => {
  res.json({ status: 'OK', message: 'Bharat Transport TMS v6.0' });
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
    const result = await pool.query(
      `SELECT u.*, b.branch_code, b.branch_name
       FROM users u
       LEFT JOIN branches b ON u.branch_id = b.id
       WHERE LOWER(u.username) = LOWER($1) OR LOWER(COALESCE(u.email, '')) = LOWER($1)
       LIMIT 1`,
      [username]
    );
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    if (user.is_active === false) return res.status(403).json({ error: 'This account is inactive' });
    let valid = false;
    if (user.password && user.password.startsWith('$2')) {
      valid = await bcrypt.compare(password, user.password);
    } else {
      valid = (password === user.password);
    }
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.password.startsWith('$2')) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, user.id]);
    }
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role || 'operator', branch_id: user.branch_id, branch_code: user.branch_code },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ success: true, token, user: { id: user.id, username: user.username, role: user.role || 'operator', branch_id: user.branch_id, branch_code: user.branch_code, branch_name: user.branch_name } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// DASHBOARD STATS
// ==========================================
app.get('/api/dashboard/stats', authMiddleware, async (req, res) => {
  try {
    if (req.query.group_by === 'branch_code') {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admin can view branch comparisons.' });
      }
      const result = await pool.query(`
        SELECT b.id, b.branch_code, b.branch_name, b.city,
          (
            SELECT COUNT(*) FROM consignments c
            WHERE (c.branch_id = b.id OR (c.branch_id IS NULL AND UPPER(TRIM(c.branch_code)) = UPPER(TRIM(b.branch_code))))
              AND c.lr_date = CURRENT_DATE
              AND COALESCE(c.is_deleted, FALSE) = FALSE
          ) AS bilties_today,
          (
            SELECT COUNT(*) FROM bill_book bill
            WHERE (bill.branch_id = b.id OR (bill.branch_id IS NULL AND UPPER(TRIM(bill.branch_code)) = UPPER(TRIM(b.branch_code))))
              AND bill.bill_date = CURRENT_DATE
          ) AS bills_today,
          (
            SELECT COALESCE(SUM(c.commission_amount), 0) FROM commissions c
            WHERE c.branch_id = b.id
          ) AS commission
        FROM branches b
        WHERE COALESCE(b.is_active, TRUE) = TRUE
        ORDER BY b.branch_name
      `);
      return res.json({ success: true, data: result.rows });
    }

    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.substring(0, 7);
    const userRole = req.user?.role || 'admin';
    const branchId = req.user?.branch_id ? parseInt(req.user.branch_id) : null;
    const branchCode = req.user?.branch_code || 'All';
    const isAdmin = userRole === 'admin';
    if (!isAdmin && (!Number.isSafeInteger(branchId) || branchId <= 0)) {
      return res.status(403).json({ error: 'Your account is not assigned to a branch.' });
    }
    const whereBranch = isAdmin ? '' : `WHERE branch_id = ${branchId}`;
    const andBranch = isAdmin ? '' : `AND branch_id = ${branchId}`;
    const globalMasterCount = (table, condition) => isAdmin
      ? pool.query(`SELECT COUNT(*) as count FROM ${table} ${condition}`)
      : Promise.resolve({ rows: [{ count: 0 }] });

    const queries = [
      pool.query(`SELECT COUNT(*) as count FROM consignments WHERE lr_date = $1 ${andBranch}`, [today]),
      pool.query(`SELECT COUNT(*) as count FROM consignments WHERE to_char(lr_date, 'YYYY-MM') = $1 ${andBranch}`, [thisMonth]),
      pool.query(`SELECT COUNT(*) as count FROM consignments WHERE 1=1 ${andBranch}`),
      pool.query(`SELECT COUNT(*) as count FROM consignments WHERE status IN ('Booked','In-Transit') ${andBranch}`),
      pool.query(`SELECT COUNT(*) as count FROM consignments WHERE COALESCE(payment_status, 'Unpaid') = 'Paid' ${andBranch}`),
      pool.query(`SELECT COUNT(*) as count FROM bill_book ${whereBranch}`),
      pool.query(`SELECT COUNT(*) as count FROM bill_book ${whereBranch} ${whereBranch ? 'AND' : 'WHERE'} COALESCE(payment_status, 'Unpaid') = 'Unpaid'`),
      pool.query(`SELECT COUNT(*) as count FROM money_receipts ${whereBranch}`),
      globalMasterCount('parties', 'WHERE COALESCE(is_active, TRUE) = TRUE'),
      globalMasterCount('customers', 'WHERE COALESCE(is_active, TRUE) = TRUE'),
      pool.query(`SELECT COALESCE(SUM(CAST(grand_total AS NUMERIC)), 0) as total FROM consignments WHERE COALESCE(payment_status, 'Unpaid') = 'Paid' ${andBranch}`),
      pool.query(`SELECT COALESCE(SUM(CAST(grand_total AS NUMERIC)), 0) as total FROM consignments WHERE COALESCE(payment_status, 'Unpaid') = 'Unpaid' ${andBranch}`),
      pool.query(`SELECT COUNT(*) as count FROM pod_records WHERE COALESCE(status, 'Pending') = 'Pending' ${andBranch}`),
      globalMasterCount('drivers', "WHERE COALESCE(status, 'Active') = 'Active'"),
      globalMasterCount('vehicles', "WHERE COALESCE(status, 'Active') = 'Active'"),
      pool.query(`SELECT COUNT(*) as count FROM claims WHERE COALESCE(status, 'Open') = 'Open' ${andBranch}`),
      pool.query(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expense_date >= $1 ${andBranch}`, [today]),
      globalMasterCount('branches', 'WHERE COALESCE(is_active, TRUE) = TRUE'),
      pool.query(`SELECT COALESCE(SUM(CAST(grand_total AS NUMERIC)), 0) as total FROM consignments WHERE lr_date = $1 AND COALESCE(payment_status, 'Unpaid') = 'Paid' ${andBranch}`, [today]),
      pool.query(`SELECT COALESCE(SUM(CAST(grand_total AS NUMERIC)), 0) as total FROM consignments WHERE to_char(lr_date, 'YYYY-MM') = $1 AND COALESCE(payment_status, 'Unpaid') = 'Paid' ${andBranch}`, [thisMonth])
    ];

    const results = await Promise.all(queries);
    const get = (idx, field = 'count') => {
      const row = results[idx]?.rows?.[0];
      if (!row) return 0;
      return field === 'count' ? parseInt(row.count || 0) : parseFloat(row.total || 0);
    };

    res.json({
      today_lr: get(0), month_lr: get(1), total_lr: get(2), pending_lr: get(3), paid_lr: get(4), total_bills: get(5),
      pending_bills: get(6), total_mr: get(7), total_parties: get(8), total_customers: get(9), total_revenue: get(10, 'total'),
      pending_amount: get(11, 'total'), pending_pod: get(12), active_drivers: get(13), active_vehicles: get(14),
      open_claims: get(15), today_expenses: get(16, 'total'), total_branches: get(17), today_revenue: get(18, 'total'),
      month_revenue: get(19, 'total'), user_role: userRole, user_branch: branchCode, success: true
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/dashboard/recent', authMiddleware, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const branchCondition = isAdmin ? '' : `WHERE branch_id = ${parseInt(req.user.branch_id)}`;
    const [recentBilties, recentMR, recentClaims] = await Promise.all([
      pool.query(`SELECT lr_no, lr_date, consignor_name, consignee_name, grand_total, status, COALESCE(payment_status, 'Unpaid') as payment_status, created_at FROM consignments ${branchCondition} ORDER BY created_at DESC LIMIT 5`),
      pool.query(`SELECT mr_no, mr_date, party_name, amount, payment_mode, created_at FROM money_receipts ${branchCondition} ORDER BY created_at DESC LIMIT 5`),
      pool.query(`SELECT lr_no, claim_type, claim_amount, COALESCE(status, 'Open') as status, created_at FROM claims ${branchCondition} ORDER BY created_at DESC LIMIT 3`)
    ]);
    res.json({ bilties: recentBilties.rows, receipts: recentMR.rows, claims: recentClaims.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/dashboard/top-parties', authMiddleware, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const branchCondition = isAdmin ? '' : `WHERE branch_id = ${parseInt(req.user.branch_id)}`;
    const result = await pool.query(`SELECT consignor_name, consignor_code, COUNT(*) as total_bilties, SUM(CAST(grand_total AS NUMERIC)) as total_revenue FROM consignments ${branchCondition} GROUP BY consignor_name, consignor_code ORDER BY total_revenue DESC LIMIT 5`);
    res.json({ data: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// BRANCH MANAGEMENT
// ==========================================
app.get('/api/branches', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admin can view branches.' });
    const result = await pool.query(
      `SELECT id, branch_code, branch_name, address, city, state, pincode, phone, email,
              gst_no, pan_no, manager_name, manager_phone, incharge_name, incharge_username,
              url_slug, branch_login_enabled, login_credentials->>'username' AS branch_login_username,
              is_active, created_at
       FROM branches
       WHERE COALESCE(is_active, TRUE) = TRUE
       ORDER BY branch_name`
    );
    res.json({ data: result.rows });
  }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/branches/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return res.status(400).json({ error: 'Invalid branch URL.' });
    }

    const result = await pool.query(
      `SELECT id, branch_code, branch_name, city, state, url_slug, is_active, branch_login_enabled
       FROM branches
       WHERE url_slug = $1`,
      [slug]
    );
    const branch = result.rows[0];
    if (!branch) return res.status(404).json({ error: 'Branch not found.' });
    if (!branch.is_active) return res.status(403).json({ error: 'Branch is inactive.' });
    if (!branch.branch_login_enabled) return res.status(403).json({ error: 'Branch login is not enabled.' });

    const publicBranch = {
      id: branch.id,
      branch_code: branch.branch_code,
      branch_name: branch.branch_name,
      city: branch.city,
      state: branch.state,
      url_slug: branch.url_slug
    };
    return res.json({ success: true, branch: publicBranch });
  } catch (err) {
    console.error('Branch lookup failed:', err);
    return res.status(500).json({ error: 'Unable to load branch.' });
  }
});
app.post('/api/branches', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admin can create branches.' });
    if (['branch_login_enabled', 'login_credentials', 'incharge_username', 'incharge_password'].some((key) => key in req.body)) {
      return res.status(400).json({ error: 'Use the branch login setup endpoint to configure login credentials.' });
    }
    const keys = Object.keys(req.body); const values = Object.values(req.body);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const result = await pool.query(`INSERT INTO branches (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`, values);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/branches/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admin can update branches.' });
    const id = req.params.id; const data = { ...req.body }; delete data.id; delete data.created_at;
    if ('branch_login_enabled' in data || 'login_credentials' in data || 'incharge_username' in data || 'incharge_password' in data) {
      return res.status(400).json({ error: 'Use the branch login setup endpoint to change login credentials.' });
    }
    const keys = Object.keys(data); const values = Object.values(data);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', '); values.push(id);
    const result = await pool.query(
      `UPDATE branches SET ${setClause} WHERE id = $${values.length}
       RETURNING id, branch_code, branch_name, city, state, address, phone, email, incharge_name,
                 incharge_username, url_slug, branch_login_enabled, is_active`,
      values
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/branches/:id', authMiddleware, async (req, res) => {
try {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admin can delete branches.' });
  await pool.query('UPDATE branches SET is_active = FALSE WHERE id = $1', [req.params.id]);
  res.json({ success: true });
}
  catch (err) { res.status(500).json({ error: err.message }); }
}); 
// ==========================================
// BRANCH LOGIN & PORTAL SYSTEM
// ==========================================

function generateSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

app.post('/api/branches/:id/branch-login', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admin can set branch login credentials.' });

    const branchId = Number(req.params.id);
    const { username, password } = req.body || {};
    if (!Number.isSafeInteger(branchId) || branchId < 1) {
      return res.status(400).json({ error: 'Invalid branch id.' });
    }
    if (
      typeof username !== 'string' ||
      !username.trim() ||
      username.trim().length > 100 ||
      typeof password !== 'string' ||
      password.length < 8 ||
      Buffer.byteLength(password, 'utf8') > 72
    ) {
      return res.status(400).json({ error: 'Enter a username and a password between 8 and 72 bytes.' });
    }

    const branchResult = await pool.query(
      'SELECT id, branch_code, branch_name, city, state, url_slug FROM branches WHERE id = $1',
      [branchId]
    );
    const branch = branchResult.rows[0];
    if (!branch) return res.status(404).json({ error: 'Branch not found.' });

    const slug = branch.url_slug || generateSlug(branch.city || branch.branch_code);
    if (!slug) return res.status(400).json({ error: 'Set a branch city or code before configuring login.' });

    const duplicate = await pool.query(
      'SELECT id FROM branches WHERE url_slug = $1 AND id <> $2',
      [slug, branchId]
    );
    if (duplicate.rows.length) {
      return res.status(409).json({ error: 'This branch URL is already assigned to another branch.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const credentials = JSON.stringify({ username: username.trim(), password: passwordHash });
    const updatedResult = await pool.query(
      `UPDATE branches
       SET url_slug = $1, branch_login_enabled = TRUE, login_credentials = $2::jsonb
       WHERE id = $3
       RETURNING id, branch_code, branch_name, city, state, url_slug, branch_login_enabled`,
      [slug, credentials, branchId]
    );
    const updatedBranch = updatedResult.rows[0];

    await logAudit('SETUP', 'branch_login', branchId, `Configured branch login for ${branch.branch_name}`, req.user.username);
    return res.json({
      success: true,
      branch: updatedBranch,
      credentials: { username: username.trim(), password },
      portal_url: `https://bharat-transport-v2.pages.dev/#/branch-login/${slug}`
    });
  } catch (err) {
    console.error('Branch login setup failed:', err);
    return res.status(500).json({ error: 'Unable to set branch login credentials.' });
  }
});

// CREATE BRANCH (Admin only)
app.post('/api/branches/create', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admin can create branches' });
    
    const { branch_name, city, state, address, phone, email, incharge_name } = req.body;
    
    if (
      typeof branch_name !== 'string' || !branch_name.trim() ||
      typeof city !== 'string' || !city.trim() ||
      typeof incharge_name !== 'string' || !incharge_name.trim()
    ) {
      return res.status(400).json({ error: 'Branch name, city, and incharge name are required' });
    }
    
    const slug = generateSlug(city);
    if (!slug) return res.status(400).json({ error: 'Branch city must include letters or numbers.' });
    const branch_code = slug.toUpperCase().slice(0, 6);
    
    const existing = await pool.query(
      'SELECT id FROM branches WHERE url_slug = $1 OR branch_code = $2',
      [slug, branch_code]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'A branch with this city URL already exists. Use a unique city or code.' });
    }
    
    const result = await pool.query(
      `INSERT INTO branches (branch_code, branch_name, city, state, address, phone, email, incharge_name, url_slug, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE)
       RETURNING id, branch_code, branch_name, city, state, incharge_name, url_slug, branch_login_enabled`,
      [branch_code, branch_name, city, state, address || '', phone || '', email || '', incharge_name, slug]
    );
    
    const branch = result.rows[0];
    const portal_url = `https://bharat-transport-v2.pages.dev/#/branch-login/${slug}`;
    
    await logAudit('CREATE', 'branches', branch.id, `Created branch: ${branch_name}`, req.user.username);
    
    res.json({ success: true, branch: { ...branch, portal_url } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET BRANCH INFO BY SLUG (Public)
app.get('/api/branch/info/:slug', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, branch_code, branch_name, city, state, incharge_name, phone, email, is_active, url_slug 
       FROM branches WHERE url_slug = $1`,
      [req.params.slug]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Branch not found' });
    const branch = result.rows[0];
    if (!branch.is_active) return res.status(403).json({ error: 'Branch is inactive' });
    res.json({ success: true, branch });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/branch/login', (req, res) => {
  res.status(410).json({ error: 'This login endpoint is retired. Use the branch-specific login URL.' });
});

// ==========================================
// CONSIGNMENTS
// ==========================================
async function generateBiltyNo(db = pool) {
  const result = await db.query(
    `SELECT COALESCE(MAX(((regexp_match(lr_no, '([0-9]+)$'))[1])::BIGINT), 0) AS max_serial
     FROM consignments WHERE lr_no ~ '[0-9]+$'`
  );
  const nextSerial = BigInt(result.rows[0].max_serial || 0) + 1n;
  return `BTC-${String(nextSerial).padStart(5, '0')}`;
}

app.get('/api/consignments/track', async (req, res) => {
  try {
    const lr_no = req.query.lr_no;
    if (!lr_no) return res.status(400).json({ error: 'LR number required' });
    const result = await pool.query('SELECT lr_no, lr_date, from_name, to_name, consignor_name, consignee_name, status, pod_status, branch_code FROM consignments WHERE lr_no = $1 AND COALESCE(is_deleted, FALSE) = FALSE', [lr_no]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Bilty not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/consignments/next-number', authMiddleware, async (req, res) => {
  try {
    res.json({ lr_no: await generateBiltyNo() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/consignments', authMiddleware, async (req, res) => {
  try {
    const isAdmin = String(req.user.role || '').toLowerCase() === 'admin';
    const branchId = Number(req.user.branch_id);
    const search = String(req.query.search || '').trim();
    const lrNumber = String(req.query.lrNumber || '').trim();
    if (!isAdmin && (!Number.isSafeInteger(branchId) || branchId <= 0)) {
      return res.status(403).json({ error: 'Your account is not assigned to a branch' });
    }
    const result = lrNumber
      ? isAdmin
        ? await pool.query(
          'SELECT id, lr_no FROM consignments WHERE LOWER(lr_no) = LOWER($1) AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1',
          [lrNumber]
        )
        : await pool.query(
          'SELECT id, lr_no FROM consignments WHERE LOWER(lr_no) = LOWER($1) AND branch_id = $2 AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1',
          [lrNumber, branchId]
        )
      : isAdmin
      ? search
        ? await pool.query('SELECT * FROM consignments WHERE COALESCE(is_deleted, FALSE) = FALSE AND lr_no ILIKE $1 ORDER BY (lr_no = $2) DESC, id DESC LIMIT 100', [`%${search}%`, search])
        : await pool.query('SELECT * FROM consignments WHERE COALESCE(is_deleted, FALSE) = FALSE ORDER BY id DESC LIMIT 500')
      : search
        ? await pool.query('SELECT * FROM consignments WHERE branch_id = $1 AND COALESCE(is_deleted, FALSE) = FALSE AND lr_no ILIKE $2 ORDER BY (lr_no = $3) DESC, id DESC LIMIT 100', [branchId, `%${search}%`, search])
        : await pool.query('SELECT * FROM consignments WHERE branch_id = $1 AND COALESCE(is_deleted, FALSE) = FALSE ORDER BY id DESC LIMIT 500', [branchId]);
    res.json({ data: result.rows, total: result.rows.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/consignments/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM consignments WHERE id = $1 AND COALESCE(is_deleted, FALSE) = FALSE', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/consignments', authMiddleware, async (req, res) => {
  let client;
  let transactionStarted = false;
  try {
    client = await pool.connect();
    const {
      vehicle_no,
      customer_code_consignor,
      customer_code_consignee,
      basis_of_booking,
      total_cft_cmt,
      insurance_policy_no,
      ...requestData
    } = req.body;
    const c = { ...requestData };
    if ((!c.actual_weight || Number(c.actual_weight) === 0) && (c.act_wt ?? c.actWt) != null) c.actual_weight = c.act_wt ?? c.actWt;
    if ((!c.charged_weight || Number(c.charged_weight) === 0) && (c.chg_wt ?? c.chgWt) != null) c.charged_weight = c.chg_wt ?? c.chgWt;
    if ((!c.no_of_packages || Number(c.no_of_packages) === 0) && c.package_count != null) c.no_of_packages = c.package_count;
    if (c.package_count == null && c.no_of_packages != null) c.package_count = c.no_of_packages;
    delete c.act_wt;
    delete c.chg_wt;
    delete c.actWt;
    delete c.chgWt;
    if (!c.method_of_packing && c.package_type) c.method_of_packing = c.package_type;
    if (!c.package_type && c.method_of_packing) c.package_type = c.method_of_packing;
    if (!c.lorry_no && vehicle_no) c.lorry_no = vehicle_no;
    if (!c.consignor_code && customer_code_consignor) c.consignor_code = customer_code_consignor;
    if (!c.consignee_code && customer_code_consignee) c.consignee_code = customer_code_consignee;
    if (!c.basis_booking && basis_of_booking) c.basis_booking = basis_of_booking;
    if (!c.total_cft && total_cft_cmt) c.total_cft = total_cft_cmt;
    if (!c.policy_no && insurance_policy_no) c.policy_no = insurance_policy_no;
    if (c.mr_active !== true) {
      for (const key of Object.keys(c)) {
        if (key.startsWith('mr_')) delete c[key];
      }
    }
    if (!c.branch_id) c.branch_id = req.user.branch_id;
    if (!c.branch_code && req.user.branch_code) c.branch_code = req.user.branch_code;
    if (!c.status) c.status = 'Booked';
    if (!c.payment_status) c.payment_status = c.basis_booking === 'PAID' ? 'Paid' : 'Unpaid';
    if (!c.created_by) c.created_by = req.user.username;
    if (!c.lr_date) c.lr_date = new Date().toISOString().split('T')[0];
    if (!c.eway_valid_upto) c.eway_valid_upto = null;
    c.lr_no = typeof c.lr_no === 'string' ? c.lr_no.trim() : '';
    if (c.lr_no && !/^[A-Za-z0-9/-]+$/.test(c.lr_no)) {
      return res.status(400).json({ error: 'LR number may only contain letters, numbers, hyphens, or slashes' });
    }
    await client.query('BEGIN');
    transactionStarted = true;
    await client.query('SELECT pg_advisory_xact_lock($1)', [823741905]);
    if (!c.lr_no) c.lr_no = await generateBiltyNo(client);
    const existing = await client.query(
      'SELECT 1 FROM consignments WHERE LOWER(lr_no) = LOWER($1) LIMIT 1',
      [c.lr_no]
    );
    if (existing.rowCount > 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(409).json({ error: 'This Bilty No already exists' });
    }
    const keys = Object.keys(c); const values = Object.values(c);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const result = await client.query(`INSERT INTO consignments (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`, values);
    await client.query('COMMIT');
    transactionStarted = false;
    res.json(result.rows[0]);
  } catch (err) {
    if (transactionStarted) {
      try { await client.query('ROLLBACK'); }
      catch (rollbackErr) { console.error('Consignment transaction rollback failed:', rollbackErr.message); }
    }
    if (err.code === '23505') return res.status(409).json({ error: 'This Bilty No already exists' });
    res.status(500).json({ error: err.message });
  } finally {
    if (client) client.release();
  }
});
app.put('/api/consignments/:id', authMiddleware, async (req, res) => {
  try {
    const id = req.params.id; const data = { ...req.body }; delete data.id; delete data.created_at; data.updated_at = new Date().toISOString();
    if ((!data.actual_weight || Number(data.actual_weight) === 0) && (data.act_wt ?? data.actWt) != null) data.actual_weight = data.act_wt ?? data.actWt;
    if ((!data.charged_weight || Number(data.charged_weight) === 0) && (data.chg_wt ?? data.chgWt) != null) data.charged_weight = data.chg_wt ?? data.chgWt;
    if ((!data.no_of_packages || Number(data.no_of_packages) === 0) && data.package_count != null) data.no_of_packages = data.package_count;
    if (data.package_count == null && data.no_of_packages != null) data.package_count = data.no_of_packages;
    const columnAliases = {
      vehicle_no: 'lorry_no',
      customer_code_consignor: 'consignor_code',
      customer_code_consignee: 'consignee_code',
      basis_of_booking: 'basis_booking',
      total_cft_cmt: 'total_cft',
      insurance_policy_no: 'policy_no'
    };
    for (const [field, column] of Object.entries(columnAliases)) {
      if (field in data) {
        data[column] = data[field];
        delete data[field];
      }
    }
    delete data.act_wt;
    delete data.chg_wt;
    delete data.actWt;
    delete data.chgWt;
    if (data.package_type && !data.method_of_packing) data.method_of_packing = data.package_type;
    if (data.method_of_packing && !data.package_type) data.package_type = data.method_of_packing;
    if (data.mr_active !== true) {
      const explicitlyDisabledMr = data.mr_active === false;
      for (const key of Object.keys(data)) {
        if (key.startsWith('mr_')) delete data[key];
      }
      if (explicitlyDisabledMr) data.mr_active = false;
    }
    const keys = Object.keys(data); const values = Object.values(data);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', '); values.push(id);
    const result = await pool.query(`UPDATE consignments SET ${setClause} WHERE id = $${values.length} RETURNING *`, values);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/consignments/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE consignments SET is_deleted = TRUE WHERE id = $1 AND COALESCE(is_deleted, FALSE) = FALSE RETURNING id',
      [req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Bilty not found' });
    res.json({ success: true });
  }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// POD
// ==========================================
app.get('/api/pod', authMiddleware, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const branchCondition = isAdmin ? '' : `WHERE branch_id = ${parseInt(req.user.branch_id)}`;
    const result = await pool.query(`SELECT * FROM pod_records ${branchCondition} ORDER BY id DESC LIMIT 200`);
    res.json({ data: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/pod', authMiddleware, async (req, res) => {
  try {
    const { lr_no, delivery_date, delivered_by, receiver_name, receiver_signature, receiver_phone, delivery_remarks, photo_url, branch_id } = req.body;
    const result = await pool.query(`INSERT INTO pod_records (lr_no, branch_id, delivery_date, delivered_by, receiver_name, receiver_signature, receiver_phone, delivery_remarks, photo_url, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Delivered') RETURNING *`, [lr_no, branch_id || req.user.branch_id, delivery_date, delivered_by, receiver_name, receiver_signature, receiver_phone, delivery_remarks, photo_url]);
    await pool.query("UPDATE consignments SET pod_status = 'Delivered', pod_date = $1 WHERE lr_no = $2", [delivery_date, lr_no]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// DRIVERS & VEHICLES
// ==========================================
app.get('/api/drivers', authMiddleware, async (req, res) => {
  try { const result = await pool.query("SELECT * FROM drivers WHERE COALESCE(status, 'Active') = 'Active' ORDER BY driver_name"); res.json({ data: result.rows }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/drivers', authMiddleware, async (req, res) => {
  try {
    const keys = Object.keys(req.body); const values = Object.values(req.body);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const result = await pool.query(`INSERT INTO drivers (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`, values);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/drivers/:id', authMiddleware, async (req, res) => {
  try {
    const id = req.params.id; const data = { ...req.body }; delete data.id; delete data.created_at;
    const keys = Object.keys(data); const values = Object.values(data);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', '); values.push(id);
    const result = await pool.query(`UPDATE drivers SET ${setClause} WHERE id = $${values.length} RETURNING *`, values);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/vehicles', authMiddleware, async (req, res) => {
  try { const result = await pool.query("SELECT * FROM vehicles WHERE COALESCE(status, 'Active') = 'Active' ORDER BY vehicle_no"); res.json({ data: result.rows }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/vehicles', authMiddleware, async (req, res) => {
  try {
    const keys = Object.keys(req.body); const values = Object.values(req.body);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const result = await pool.query(`INSERT INTO vehicles (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`, values);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/vehicles/expiring', authMiddleware, async (req, res) => {
  try {
    const thirtyDays = new Date(); thirtyDays.setDate(thirtyDays.getDate() + 30);
    const result = await pool.query(`SELECT * FROM vehicles WHERE insurance_expiry <= $1 OR fitness_expiry <= $1 OR permit_expiry <= $1 OR rc_expiry <= $1 ORDER BY insurance_expiry ASC`, [thirtyDays.toISOString().split('T')[0]]);
    res.json({ data: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// FREIGHT RATES, MATERIALS, ROUTES
// ==========================================
app.get('/api/freight-rates', authMiddleware, async (req, res) => {
  try { const result = await pool.query("SELECT * FROM freight_rates WHERE COALESCE(is_active, TRUE) = TRUE ORDER BY from_city, to_city"); res.json({ data: result.rows }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/freight-rates', authMiddleware, async (req, res) => {
  try {
    const keys = Object.keys(req.body); const values = Object.values(req.body);
    const result = await pool.query(`INSERT INTO freight_rates (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`, values);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/materials', authMiddleware, async (req, res) => {
  try { const result = await pool.query("SELECT * FROM materials WHERE COALESCE(is_active, TRUE) = TRUE ORDER BY material_name"); res.json({ data: result.rows }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/materials', authMiddleware, async (req, res) => {
  try {
    const keys = Object.keys(req.body); const values = Object.values(req.body);
    const result = await pool.query(`INSERT INTO materials (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`, values);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/routes', authMiddleware, async (req, res) => {
  try { const result = await pool.query("SELECT * FROM routes WHERE COALESCE(is_active, TRUE) = TRUE ORDER BY from_city, to_city"); res.json({ data: result.rows }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/routes', authMiddleware, async (req, res) => {
  try {
    const keys = Object.keys(req.body); const values = Object.values(req.body);
    const result = await pool.query(`INSERT INTO routes (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`, values);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// PARTY LEDGER & OUTSTANDING
// ==========================================
app.get('/api/ledger/:partyCode', authMiddleware, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const branchCondition = isAdmin ? '' : `AND branch_id = ${parseInt(req.user.branch_id)}`;
    const result = await pool.query(`SELECT * FROM party_ledger WHERE party_code = $1 ${branchCondition} ORDER BY transaction_date DESC`, [req.params.partyCode]);
    const balance = await pool.query(`SELECT COALESCE(SUM(debit),0) - COALESCE(SUM(credit),0) as balance FROM party_ledger WHERE party_code = $1 ${branchCondition}`, [req.params.partyCode]);
    res.json({ data: result.rows, balance: parseFloat(balance.rows[0].balance || 0) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/ledger', authMiddleware, async (req, res) => {
  try {
    const keys = Object.keys(req.body); const values = Object.values(req.body);
    const result = await pool.query(`INSERT INTO party_ledger (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`, values);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/outstanding', authMiddleware, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const branchCondition = isAdmin ? '' : `WHERE branch_id = ${parseInt(req.user.branch_id)}`;
    const result = await pool.query(`SELECT consignor_name as party_name, consignor_code as party_code, branch_code, COUNT(*) as total_bilties, SUM(CASE WHEN COALESCE(payment_status, 'Unpaid') = 'Unpaid' THEN CAST(grand_total AS NUMERIC) ELSE 0 END) as pending_amount, SUM(CAST(grand_total AS NUMERIC)) as total_amount FROM consignments ${branchCondition} GROUP BY consignor_name, consignor_code, branch_code HAVING SUM(CASE WHEN COALESCE(payment_status, 'Unpaid') = 'Unpaid' THEN CAST(grand_total AS NUMERIC) ELSE 0 END) > 0 ORDER BY pending_amount DESC`);
    res.json({ data: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// EXPENSES, CLAIMS, COMMISSIONS
// ==========================================
app.get('/api/expenses', authMiddleware, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const branchCondition = isAdmin ? '' : `WHERE branch_id = ${parseInt(req.user.branch_id)}`;
    const result = await pool.query(`SELECT * FROM expenses ${branchCondition} ORDER BY expense_date DESC LIMIT 200`);
    res.json({ data: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/expenses', authMiddleware, async (req, res) => {
  try {
    const data = { ...req.body }; if (!data.branch_id) data.branch_id = req.user.branch_id;
    const keys = Object.keys(data); const values = Object.values(data);
    const result = await pool.query(`INSERT INTO expenses (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`, values);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/claims', authMiddleware, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const branchCondition = isAdmin ? '' : `WHERE branch_id = ${parseInt(req.user.branch_id)}`;
    const result = await pool.query(`SELECT * FROM claims ${branchCondition} ORDER BY id DESC`);
    res.json({ data: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/claims', authMiddleware, async (req, res) => {
  try {
    const data = { ...req.body }; if (!data.branch_id) data.branch_id = req.user.branch_id;
    const keys = Object.keys(data); const values = Object.values(data);
    const result = await pool.query(`INSERT INTO claims (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`, values);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/claims/:id', authMiddleware, async (req, res) => {
  try {
    const id = req.params.id; const data = { ...req.body }; delete data.id; delete data.created_at;
    const keys = Object.keys(data); const values = Object.values(data);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', '); values.push(id);
    const result = await pool.query(`UPDATE claims SET ${setClause} WHERE id = $${values.length} RETURNING *`, values);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/commissions', authMiddleware, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const branchCondition = isAdmin ? '' : `WHERE branch_id = ${parseInt(req.user.branch_id)}`;
    const result = await pool.query(`SELECT * FROM commissions ${branchCondition} ORDER BY id DESC`);
    res.json({ data: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/commissions', authMiddleware, async (req, res) => {
  try {
    const data = { ...req.body }; if (!data.branch_id) data.branch_id = req.user.branch_id;
    const keys = Object.keys(data); const values = Object.values(data);
    const result = await pool.query(`INSERT INTO commissions (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`, values);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// PARTIES, BILLS, MONEY RECEIPTS
// ==========================================
app.get('/api/parties', authMiddleware, async (req, res) => {
  try { const result = await pool.query('SELECT * FROM parties WHERE COALESCE(is_active, TRUE) = TRUE ORDER BY party_name'); res.json({ data: result.rows }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/parties', authMiddleware, async (req, res) => {
  try {
    const { party_code, party_name, address, gst_no, email, phone } = req.body;
    const result = await pool.query(`INSERT INTO parties (party_code, party_name, address, gst_no, email, phone) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT(party_code) DO UPDATE SET party_name=EXCLUDED.party_name, address=EXCLUDED.address, gst_no=EXCLUDED.gst_no RETURNING *`, [party_code, party_name, address || '', gst_no || '', email || '', phone || '']);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/bills', authMiddleware, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const branchCondition = isAdmin ? '' : `WHERE branch_id = ${parseInt(req.user.branch_id)}`;
    const result = await pool.query(`SELECT * FROM bill_book ${branchCondition} ORDER BY id DESC`);
    res.json({ data: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/bills/last-serial', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT COALESCE(MAX(SUBSTRING(bill_no FROM '/([0-9]+)$')::INTEGER), 0) AS last_serial
      FROM bill_book
      WHERE bill_no ~ '^BTC/26-27/[0-9]+$'
    `);
    res.json({ lastSerial: Number(result.rows[0]?.last_serial) || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/bills/:identifier', authMiddleware, async (req, res) => {
  try {
    const { identifier } = req.params;
    const isNumeric = /^\d+$/.test(identifier);
    const query = isNumeric ? `SELECT * FROM bill_book WHERE id = $1` : `SELECT * FROM bill_book WHERE bill_no = $1`;
    const result = await pool.query(query, [identifier]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Bill not found' });
    const bill = result.rows[0];
    const itemsResult = await pool.query(`SELECT * FROM bill_items WHERE bill_id = $1`, [bill.id]);
    res.json({ ...bill, items: itemsResult.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
const billFields = [
  'bill_no', 'bill_date', 'branch_id', 'branch_code', 'party_name', 'party_code', 'party_gst', 'party_address',
  'from_name', 'to_name', 'consignor_name', 'consignee_name', 'vehicle_no', 'lr_nos', 'amount',
  'gst_amount', 'total_amount', 'grand_total', 'advance_received', 'balance_due', 'net_balance',
  'trip_subtotal', 'gst_percent', 'invoice_no', 'invoice_date', 'amount_in_words', 'payment_mode',
  'payment_details', 'remarks', 'status', 'payment_status', 'created_by'
];
const validateBill = [
  body('party_name').trim().notEmpty().withMessage('Party name is required'),
  body('bill_date').optional({ checkFalsy: true }).isISO8601().withMessage('Bill date must be a valid date'),
  body('items').optional().isArray().withMessage('Items must be an array')
];
const checkBillValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg, details: errors.array() });
  next();
};
const insertBillItems = async (client, billId, items) => {
  for (const item of items) {
    await client.query(
      `INSERT INTO bill_items (bill_id, trip_date, lr_no, invoice_no, from_name, to_name, weight_mt, packages, freight, loading, unloading, other_charges, total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [billId, item.trip_date || null, item.lr_no || null, item.invoice_no || null, item.from_name || null, item.to_name || null,
        Number(item.weight_mt) || 0, parseInt(item.packages, 10) || 0, Number(item.freight) || 0,
        Number(item.loading) || 0, Number(item.unloading) || 0, Number(item.other_charges) || 0,
        Number(item.total) || 0]
    );
  }
};

app.post('/api/bills', authMiddleware, validateBill, checkBillValidation, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(260627001)');
    const bill = Object.fromEntries(Object.entries(req.body).filter(([key]) => billFields.includes(key)));
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!bill.branch_id) bill.branch_id = req.user.branch_id;
    if (!bill.bill_date) bill.bill_date = new Date().toISOString().split('T')[0];
    if (!bill.status) bill.status = 'Pending';
    if (!bill.payment_status) bill.payment_status = 'Unpaid';
    bill.created_by = req.user.username;
    if (typeof bill.bill_no === 'string') bill.bill_no = bill.bill_no.trim();
    if (!bill.bill_no) {
      const serialResult = await client.query(`
        SELECT COALESCE(MAX(SUBSTRING(bill_no FROM '/([0-9]+)$')::INTEGER), 0) AS last_serial
        FROM bill_book
        WHERE bill_no LIKE 'BTC/26-27/%'
          AND bill_no ~ '^BTC/26-27/[0-9]+$'
      `);
      bill.bill_no = `BTC/26-27/${String(Number(serialResult.rows[0].last_serial) + 1).padStart(3, '0')}`;
    }
    const fields = Object.keys(bill);
    const values = Object.values(bill);
    const result = await client.query(
      `INSERT INTO bill_book (${fields.join(', ')}) VALUES (${fields.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
      values
    );
    await insertBillItems(client, result.rows[0].id, items);
    await client.query('COMMIT');
    res.status(201).json({ ...result.rows[0], items });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(err.code === '23505' ? 409 : 500).json({ error: err.code === '23505' ? 'Bill number already exists' : err.message });
  } finally { client.release(); }
});
app.put('/api/bills/:id', authMiddleware, validateBill, checkBillValidation, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT * FROM bill_book WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Bill not found' });
    }
    const bill = Object.fromEntries(Object.entries(req.body).filter(([key]) => billFields.includes(key) && key !== 'created_by'));
    if (!bill.branch_id) bill.branch_id = existing.rows[0].branch_id || req.user.branch_id;
    const fields = Object.keys(bill);
    const values = Object.values(bill);
    const result = await client.query(
      `UPDATE bill_book SET ${fields.map((field, i) => `${field} = $${i + 1}`).join(', ')}, updated_at = NOW() WHERE id = $${fields.length + 1} RETURNING *`,
      [...values, req.params.id]
    );
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    await client.query('DELETE FROM bill_items WHERE bill_id = $1', [req.params.id]);
    await insertBillItems(client, req.params.id, items);
    await client.query('COMMIT');
    res.json({ ...result.rows[0], items });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(err.code === '23505' ? 409 : 500).json({
      error: err.code === '23505' ? 'Bill number already exists' : err.message
    });
  } finally { client.release(); }
});
app.delete('/api/bills/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM bill_book WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Bill not found' });
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// MR (MONEY RECEIPTS)
// ==========================================
app.get('/api/mr', authMiddleware, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const branchCondition = isAdmin ? '' : `WHERE branch_id = ${parseInt(req.user.branch_id)}`;
    const result = await pool.query(`SELECT * FROM money_receipts ${branchCondition} ORDER BY id DESC LIMIT 500`);
    res.json({ data: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/mr/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM money_receipts WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'MR not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/mr', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;
  try {
    const { mr_no, mr_date, party_type, party_name, bilty_id, bilty_lr_no, bill_id, bill_no, amount, payment_mode, is_advance, remarks } = req.body;
    const paymentAmount = Number(amount);
    if (!party_type || !party_name || !Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ error: 'Party type, party name, and a positive payment amount are required.' });
    }
    if (bilty_id && bill_id) {
      return res.status(400).json({ error: 'Link a receipt to either a Bilty or a Bill, not both.' });
    }

    await client.query('BEGIN');
    transactionStarted = true;
    await client.query('SELECT pg_advisory_xact_lock(260627002)');

    let outstanding;
    let linkedDocument;
    if (bilty_id) {
      const result = await client.query(
        `SELECT id, lr_no, COALESCE(NULLIF(grand_total, ''), '0')::NUMERIC AS grand_total, payment_status
         FROM consignments WHERE id = $1 FOR UPDATE`,
        [bilty_id]
      );
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        transactionStarted = false;
        return res.status(404).json({ error: 'Linked Bilty not found.' });
      }
      linkedDocument = result.rows[0];
      const payments = await client.query(
        'SELECT COALESCE(SUM(amount), 0) AS total FROM money_receipts WHERE bilty_id = $1',
        [bilty_id]
      );
      const totalReceived = Number(payments.rows[0].total);
      outstanding = linkedDocument.payment_status === 'Paid'
        ? 0
        : Math.max(Number(linkedDocument.grand_total) - totalReceived, 0);
    } else if (bill_id) {
      const result = await client.query(
        `SELECT id, bill_no, grand_total, advance_received, balance_due, payment_status
         FROM bill_book WHERE id = $1 FOR UPDATE`,
        [bill_id]
      );
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        transactionStarted = false;
        return res.status(404).json({ error: 'Linked Bill not found.' });
      }
      linkedDocument = result.rows[0];
      const total = Number(linkedDocument.grand_total) || 0;
      const received = Number(linkedDocument.advance_received) || 0;
      outstanding = linkedDocument.payment_status === 'Paid'
        ? 0
        : Math.max(Number(linkedDocument.balance_due ?? (total - received)), 0);
    }

    if (outstanding !== undefined && paymentAmount > outstanding + 0.005) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(400).json({ error: `Payment exceeds the outstanding balance of ${outstanding.toFixed(2)}.` });
    }

    let finalMRNo = mr_no;
    if (!finalMRNo || finalMRNo === 'Auto-generated') {
      const year = new Date().getFullYear().toString().slice(-2);
      const lastMR = await client.query(
        `SELECT COALESCE(MAX(SUBSTRING(mr_no FROM '/([0-9]+)$')::INTEGER), 0) AS last_serial
         FROM money_receipts WHERE mr_no LIKE $1`,
        [`MR/${year}/%`]
      );
      finalMRNo = `MR/${year}/${String(Number(lastMR.rows[0].last_serial) + 1).padStart(4, '0')}`;
    }
    const branchId = req.body.branch_id || req.user.branch_id;
    const result = await client.query(
      `INSERT INTO money_receipts
       (mr_no, mr_date, branch_id, party_type, party_name, bilty_id, bilty_lr_no, bill_id, bill_no, amount, payment_mode, is_advance, remarks, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [finalMRNo, mr_date || new Date().toISOString().split('T')[0], branchId, party_type, party_name, bilty_id || null, bilty_lr_no || null, bill_id || null, bill_no || null, paymentAmount, payment_mode || 'Cash', is_advance || false, remarks || '', req.user.username]
    );

    if (bilty_id) {
      const payments = await client.query(
        'SELECT COALESCE(SUM(amount), 0) AS total FROM money_receipts WHERE bilty_id = $1',
        [bilty_id]
      );
      const paid = Number(payments.rows[0].total) >= Number(linkedDocument.grand_total);
      await client.query(
        `UPDATE consignments SET payment_status = $1, mr_no = $2, updated_at = NOW() WHERE id = $3`,
        [paid ? 'Paid' : 'Unpaid', finalMRNo, bilty_id]
      );
    }
    if (bill_id) {
      const newBalance = Math.max(outstanding - paymentAmount, 0);
      const newAdvance = Math.max(Number(linkedDocument.grand_total) - outstanding, Number(linkedDocument.advance_received) || 0) + paymentAmount;
      await client.query(
        `UPDATE bill_book
         SET advance_received = $1, balance_due = $2, net_balance = $2,
             payment_status = $3, mr_no = $4, updated_at = NOW()
         WHERE id = $5`,
        [newAdvance, newBalance, newBalance <= 0.005 ? 'Paid' : 'Unpaid', finalMRNo, bill_id]
      );
    }

    await client.query('COMMIT');
    transactionStarted = false;
    res.json({ success: true, mr_no: finalMRNo, data: result.rows[0] });
  } catch (err) {
    if (transactionStarted) await client.query('ROLLBACK');
    res.status(err.code === '23505' ? 409 : 500).json({ error: err.code === '23505' ? 'MR number already exists.' : err.message });
  } finally {
    client.release();
  }
});
app.delete('/api/mr/:id', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const receiptResult = await client.query('SELECT * FROM money_receipts WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (receiptResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'MR not found.' });
    }
    const receipt = receiptResult.rows[0];
    await client.query('DELETE FROM money_receipts WHERE id = $1', [req.params.id]);

    if (receipt.bill_id) {
      const billResult = await client.query(
        'SELECT id, grand_total, advance_received FROM bill_book WHERE id = $1 FOR UPDATE',
        [receipt.bill_id]
      );
      if (billResult.rows.length > 0) {
        const bill = billResult.rows[0];
        const advance = Math.max((Number(bill.advance_received) || 0) - Number(receipt.amount), 0);
        const balance = Math.max((Number(bill.grand_total) || 0) - advance, 0);
        const lastReceipt = await client.query(
          'SELECT mr_no FROM money_receipts WHERE bill_id = $1 ORDER BY id DESC LIMIT 1',
          [receipt.bill_id]
        );
        await client.query(
          `UPDATE bill_book
           SET advance_received = $1, balance_due = $2, net_balance = $2,
               payment_status = $3, mr_no = $4, updated_at = NOW()
           WHERE id = $5`,
          [advance, balance, balance <= 0.005 ? 'Paid' : 'Unpaid', lastReceipt.rows[0]?.mr_no || null, receipt.bill_id]
        );
      }
    }
    if (receipt.bilty_id) {
      const biltyResult = await client.query(
        `SELECT id, COALESCE(NULLIF(grand_total, ''), '0')::NUMERIC AS grand_total, basis_booking
         FROM consignments WHERE id = $1 FOR UPDATE`,
        [receipt.bilty_id]
      );
      if (biltyResult.rows.length > 0) {
        const bilty = biltyResult.rows[0];
        const payments = await client.query(
          'SELECT COALESCE(SUM(amount), 0) AS total FROM money_receipts WHERE bilty_id = $1',
          [receipt.bilty_id]
        );
        const lastReceipt = await client.query(
          'SELECT mr_no FROM money_receipts WHERE bilty_id = $1 ORDER BY id DESC LIMIT 1',
          [receipt.bilty_id]
        );
        const paidByReceipt = Number(payments.rows[0].total) >= Number(bilty.grand_total);
        const paidAtBooking = String(bilty.basis_booking || '').trim().toLowerCase() === 'paid';
        await client.query(
          `UPDATE consignments SET payment_status = $1, mr_no = $2, updated_at = NOW() WHERE id = $3`,
          [paidByReceipt || paidAtBooking ? 'Paid' : 'Unpaid', lastReceipt.rows[0]?.mr_no || null, receipt.bilty_id]
        );
      }
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ==========================================
// AUDIT, CUSTOMERS, GATE PASS, GADI CHALLAN
// ==========================================
app.get('/api/audit', authMiddleware, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const branchCondition = isAdmin ? '' : `WHERE branch_id = ${parseInt(req.user.branch_id)}`;
    const result = await pool.query(`SELECT * FROM audit_logs ${branchCondition} ORDER BY id DESC LIMIT 200`);
    res.json({ data: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/customers', authMiddleware, async (req, res) => {
  try { const result = await pool.query('SELECT * FROM customers WHERE COALESCE(is_active, TRUE) = TRUE ORDER BY customer_name'); res.json(result.rows); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/customers/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found.' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/customers', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const customerName = String(req.body.customer_name || req.body.name || '').trim();
    const mobile = String(req.body.mobile || req.body.phone || '').trim();
    if (!customerName || !mobile) {
      return res.status(400).json({ error: 'Customer name and mobile are required.' });
    }

    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(260627003)');
    let customerCode = String(req.body.customer_code || '').trim();
    if (!customerCode) {
      const codeResult = await client.query(
        `SELECT COALESCE(MAX(SUBSTRING(customer_code FROM '[0-9]+$')::INTEGER), 0) AS last_serial
         FROM customers WHERE customer_code ~ '^CUST[0-9]+$'`
      );
      customerCode = `CUST${String(Number(codeResult.rows[0].last_serial) + 1).padStart(4, '0')}`;
    }
    const result = await client.query(
      `INSERT INTO customers
       (customer_code, customer_name, mobile, phone, whatsapp, email, address, city, state, pincode, gst_no, pan_no, customer_type, credit_limit, credit_days, opening_balance)
       VALUES ($1,$2,$3,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [
        customerCode,
        customerName,
        mobile,
        req.body.whatsapp || mobile,
        req.body.email || null,
        req.body.address || null,
        req.body.city || null,
        req.body.state || null,
        req.body.pincode || null,
        req.body.gst_no || null,
        req.body.pan_no || null,
        req.body.customer_type || 'Cash',
        Number(req.body.credit_limit) || 0,
        Number(req.body.credit_days) || 0,
        Number(req.body.opening_balance) || 0
      ]
    );
    await client.query('COMMIT');
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(err.code === '23505' ? 409 : 500).json({
      error: err.code === '23505' ? 'Customer code already exists.' : err.message
    });
  } finally {
    client.release();
  }
});
app.put('/api/customers/:id', authMiddleware, async (req, res) => {
  const fields = {
    customer_code: req.body.customer_code,
    customer_name: req.body.customer_name || req.body.name,
    mobile: req.body.mobile || req.body.phone,
    phone: req.body.mobile || req.body.phone,
    whatsapp: req.body.whatsapp,
    email: req.body.email,
    address: req.body.address,
    city: req.body.city,
    state: req.body.state,
    pincode: req.body.pincode,
    gst_no: req.body.gst_no,
    pan_no: req.body.pan_no,
    customer_type: req.body.customer_type,
    credit_limit: req.body.credit_limit,
    credit_days: req.body.credit_days,
    opening_balance: req.body.opening_balance,
    is_active: req.body.is_active
  };
  const updates = Object.entries(fields).filter(([, value]) => value !== undefined);
  if (!String(req.body.customer_name || req.body.name || '').trim() || !String(req.body.mobile || req.body.phone || '').trim()) {
    return res.status(400).json({ error: 'Customer name and mobile are required.' });
  }
  if (updates.length === 0) return res.status(400).json({ error: 'No customer fields provided.' });

  try {
    const values = updates.map(([, value]) => value);
    const assignments = updates.map(([field], index) => `${field} = $${index + 1}`);
    const result = await pool.query(
      `UPDATE customers SET ${assignments.join(', ')} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found.' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(err.code === '23505' ? 409 : 500).json({
      error: err.code === '23505' ? 'Customer code already exists.' : err.message
    });
  }
});
app.delete('/api/customers/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE customers SET is_active = FALSE WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found.' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/gate-pass', authMiddleware, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const branchCondition = isAdmin ? '' : `WHERE branch_id = ${parseInt(req.user.branch_id)}`;
    const result = await pool.query(`SELECT * FROM gate_passes ${branchCondition} ORDER BY id DESC LIMIT 100`);
    res.json({ data: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/gate-pass', authMiddleware, async (req, res) => {
  try {
    const { lr_no, vehicle_no, driver_name, driver_mobile, material_desc, quantity, weight, valid_until, issued_by } = req.body;
    const branchId = req.body.branch_id || req.user.branch_id;
    const year = String(new Date().getFullYear()).slice(-2);
    const result = await pool.query(`SELECT pass_no FROM gate_passes WHERE pass_no LIKE $1 ORDER BY id DESC LIMIT 1`, [`GP/${year}/%`]);
    let nextSerial = 1;
    if (result.rows.length > 0 && result.rows[0].pass_no) {
      const parts = result.rows[0].pass_no.split('/'); if (parts.length === 3) nextSerial = parseInt(parts[2]) + 1;
    }
    const pass_no = `GP/${year}/${String(nextSerial).padStart(4, '0')}`;
    const row = await pool.query(`INSERT INTO gate_passes (pass_no, branch_id, lr_no, vehicle_no, driver_name, driver_mobile, material_desc, quantity, weight, valid_until, issued_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`, [pass_no, branchId, lr_no, vehicle_no, driver_name, driver_mobile, material_desc, quantity, weight, valid_until, issued_by]);
    res.json(row.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/gadi-challan', authMiddleware, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const branchCondition = isAdmin ? '' : `WHERE branch_id = ${parseInt(req.user.branch_id)}`;
    const result = await pool.query(`SELECT * FROM gadi_challans ${branchCondition} ORDER BY id DESC LIMIT 100`);
    res.json({ data: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/gadi-challan/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM gadi_challans WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Challan not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/gadi-challan', authMiddleware, async (req, res) => {
  try {
    const c = { ...req.body }; if (!c.branch_id) c.branch_id = req.user.branch_id;
    const year = String(new Date().getFullYear()).slice(-2);
    const result = await pool.query(`SELECT challan_no FROM gadi_challans WHERE challan_no LIKE $1 ORDER BY id DESC LIMIT 1`, [`GC/${year}/%`]);
    let nextSerial = 1;
    if (result.rows.length > 0 && result.rows[0].challan_no) {
      const parts = result.rows[0].challan_no.split('/'); if (parts.length === 3) nextSerial = parseInt(parts[2]) + 1;
    }
    c.challan_no = `GC/${year}/${String(nextSerial).padStart(4, '0')}`;
    const numericFields = ['freight_amount', 'advance_paid', 'balance_due', 'toll_expense', 'diesel_expense', 'other_expense', 'tds_deduction', 'net_payable', 'broker_commission'];
    numericFields.forEach(field => { if (c[field] === '' || c[field] === null || c[field] === undefined) c[field] = null; else c[field] = parseFloat(c[field]); });
    const keys = Object.keys(c); const values = Object.values(c);
    const row = await pool.query(`INSERT INTO gadi_challans (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`, values);
    res.json(row.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const documentStockTypes = ['bilty', 'mr', 'gadi_challan', 'billing', 'gate_pass', 'pod'];

app.get('/api/stock', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      WITH usage_counts AS (
        SELECT 'bilty' AS document_type, COUNT(*) AS used_count,
          COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) IN ('booked', 'in-transit', 'in transit')) AS running_count,
          COUNT(*) FILTER (WHERE LOWER(COALESCE(payment_status, 'unpaid')) = 'unpaid') AS pending_count
        FROM consignments
        UNION ALL
        SELECT 'mr', COUNT(*), 0, 0 FROM money_receipts
        UNION ALL
        SELECT 'gadi_challan', COUNT(*), 0,
          COUNT(*) FILTER (WHERE COALESCE(balance_due, 0) > 0)
        FROM gadi_challans
        UNION ALL
        SELECT 'billing', COUNT(*), 0,
          COUNT(*) FILTER (WHERE LOWER(COALESCE(payment_status, 'unpaid')) = 'unpaid')
        FROM bill_book
        UNION ALL
        SELECT 'gate_pass', COUNT(*),
          COUNT(*) FILTER (WHERE valid_until IS NULL OR valid_until >= CURRENT_DATE), 0
        FROM gate_passes
        UNION ALL
        SELECT 'pod', COUNT(*), 0, 0
        FROM pod_records
      ),
      updated_stock AS (
        UPDATE document_stock AS stock
        SET used_count = usage_counts.used_count
        FROM usage_counts
        WHERE stock.document_type = usage_counts.document_type
        RETURNING stock.document_type, stock.total_stock, stock.used_count
      )
      SELECT stock.document_type, stock.total_stock, usage_counts.used_count, usage_counts.running_count,
        usage_counts.pending_count,
        GREATEST(stock.total_stock - usage_counts.used_count, 0) AS remaining_count
      FROM updated_stock AS stock
      JOIN usage_counts USING (document_type)
      ORDER BY CASE stock.document_type
        WHEN 'bilty' THEN 1 WHEN 'mr' THEN 2 WHEN 'gadi_challan' THEN 3
        WHEN 'billing' THEN 4 WHEN 'gate_pass' THEN 5 WHEN 'pod' THEN 6
      END
    `);
    res.json({ data: result.rows });
  } catch (err) {
    console.error('Stock lookup error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/stock/add', authMiddleware, async (req, res) => {
  try {
    if (String(req.user.role || '').toLowerCase() !== 'admin') {
      return res.status(403).json({ error: 'Only admin can add stock' });
    }
    const { document_type: documentType } = req.body;
    const quantity = Number(req.body.quantity);
    if (!documentStockTypes.includes(documentType)) {
      return res.status(404).json({ error: 'Unknown document type' });
    }
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'Purchase quantity must be a positive whole number' });
    }
    const result = await pool.query(
      `UPDATE document_stock SET total_stock = total_stock + $1, last_updated = NOW()
       WHERE document_type = $2 RETURNING document_type, total_stock, used_count, last_updated`,
      [quantity, documentType]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Stock record not found' });
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('Stock add error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// TRANSIT / MANIFEST MODULE
// ==========================================
app.get('/api/manifests', authMiddleware, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const branchCondition = isAdmin ? '' : `WHERE m.branch_id = ${parseInt(req.user.branch_id)}`;
    const result = await pool.query(`SELECT m.*, COUNT(mi.id) as total_lrs, STRING_AGG(mi.lr_no, ', ') as lr_nos FROM manifests m LEFT JOIN manifest_items mi ON m.id = mi.manifest_id ${branchCondition} GROUP BY m.id ORDER BY m.created_at DESC LIMIT 200`);
    res.json({ data: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/manifests', authMiddleware, async (req, res) => {
  try {
    const { manifest_no, manifest_date, branch_id, from_branch, to_branch, vehicle_no, driver_name, driver_mobile, lr_nos, status, remarks } = req.body;
    const bId = branch_id || req.user.branch_id;
    const year = String(new Date().getFullYear()).slice(-2);
    let finalManifestNo = manifest_no;
    if (!finalManifestNo) {
      const lastManifest = await pool.query(`SELECT manifest_no FROM manifests WHERE manifest_no LIKE $1 ORDER BY id DESC LIMIT 1`, [`MF/${year}/%`]);
      let nextSerial = 1;
      if (lastManifest.rows.length > 0 && lastManifest.rows[0].manifest_no) {
        const parts = lastManifest.rows[0].manifest_no.split('/'); nextSerial = parseInt(parts[2] || '0') + 1;
      }
      finalManifestNo = `MF/${year}/${String(nextSerial).padStart(4, '0')}`;
    }
    const result = await pool.query(`INSERT INTO manifests (manifest_no, manifest_date, branch_id, from_branch, to_branch, vehicle_no, driver_name, driver_mobile, status, remarks, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`, [finalManifestNo, manifest_date || new Date().toISOString().split('T')[0], bId, from_branch, to_branch, vehicle_no, driver_name, driver_mobile, status || 'Created', remarks || '', req.user.username]);
    const manifestId = result.rows[0].id;
    if (lr_nos && lr_nos.length > 0) {
      const lrArray = lr_nos.split(',').map(lr => lr.trim());
      for (const lr_no of lrArray) {
        await pool.query(`INSERT INTO manifest_items (manifest_id, lr_no, branch_id) VALUES ($1, $2, $3)`, [manifestId, lr_no, bId]);
        await pool.query(`UPDATE consignments SET status = 'In-Transit', lorry_no = $1, driver_name = $2 WHERE lr_no = $3`, [vehicle_no, driver_name, lr_no]);
      }
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// PUBLIC POD UPLOAD & VIEW
// ==========================================
app.post('/api/public/pod-upload', async (req, res) => {
  try {
    const { lr_no, delivery_date, delivered_by, receiver_name, receiver_phone, delivery_remarks, photo_url } = req.body;
    if (!lr_no) return res.status(400).json({ error: 'LR Number is required' });
    const biltyCheck = await pool.query('SELECT id, lr_no FROM consignments WHERE lr_no = $1', [lr_no]);
    if (biltyCheck.rows.length === 0) return res.status(404).json({ error: 'Bilty not found' });
    const finalDate = delivery_date || new Date().toISOString().split('T')[0];
    const result = await pool.query(`INSERT INTO pod_records (lr_no, branch_id, delivery_date, delivered_by, receiver_name, receiver_phone, delivery_remarks, photo_url, status) VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, 'Delivered') RETURNING *`, [lr_no, finalDate, delivered_by || '', receiver_name || '', receiver_phone || '', delivery_remarks || '', photo_url || '']);
    await pool.query("UPDATE consignments SET pod_status = 'Delivered', pod_date = $1 WHERE lr_no = $2", [finalDate, lr_no]);
    res.json({ success: true, message: 'POD uploaded successfully!', data: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/public/pod-view', async (req, res) => {
  try {
    const lr_no = req.query.lr_no;
    if (!lr_no) return res.status(400).json({ error: 'LR Number is required' });
    const podResult = await pool.query(`SELECT * FROM pod_records WHERE lr_no = $1 ORDER BY created_at DESC LIMIT 1`, [lr_no]);
    const biltyResult = await pool.query(`SELECT lr_no, lr_date, consignor_name, consignee_name, from_name, to_name, packages, actual_weight, grand_total, status, pod_status FROM consignments WHERE lr_no = $1`, [lr_no]);
    if (podResult.rows.length === 0 && biltyResult.rows.length === 0) return res.status(404).json({ error: 'No POD or Bilty found' });
    res.json({ success: true, pod: podResult.rows[0] || null, bilty: biltyResult.rows[0] || null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// TRIP MANAGEMENT MODULE
// ==========================================
app.get('/api/trips', authMiddleware, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const branchCondition = isAdmin ? '' : `WHERE branch_id = ${parseInt(req.user.branch_id)}`;
    const result = await pool.query(`SELECT * FROM trips ${branchCondition} ORDER BY trip_date DESC LIMIT 200`);
    res.json({ data: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/trips', authMiddleware, async (req, res) => {
  try {
    const t = { ...req.body }; if (!t.branch_id) t.branch_id = req.user.branch_id; if (!t.created_by) t.created_by = req.user.username;
    const year = String(new Date().getFullYear()).slice(-2);
    const result = await pool.query(`SELECT trip_no FROM trips WHERE trip_no LIKE $1 ORDER BY id DESC LIMIT 1`, [`TRP/${year}/%`]);
    let nextSerial = 1;
    if (result.rows.length > 0 && result.rows[0].trip_no) {
      const parts = result.rows[0].trip_no.split('/'); if (parts.length === 3) nextSerial = parseInt(parts[2]) + 1;
    }
    t.trip_no = `TRP/${year}/${String(nextSerial).padStart(4, '0')}`;
    const keys = Object.keys(t); const values = Object.values(t);
    const row = await pool.query(`INSERT INTO trips (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`, values);
    res.json(row.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/trips/:id', authMiddleware, async (req, res) => {
  try {
    const id = req.params.id; const data = { ...req.body }; delete data.id; delete data.created_at; data.updated_at = new Date().toISOString();
    const keys = Object.keys(data); const values = Object.values(data);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', '); values.push(id);
    const result = await pool.query(`UPDATE trips SET ${setClause} WHERE id = $${values.length} RETURNING *`, values);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// SMART RATE ENGINE MODULE
// ==========================================
app.get('/api/rates', authMiddleware, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const branchCondition = isAdmin ? '' : `WHERE branch_id = ${parseInt(req.user.branch_id)}`;
    const result = await pool.query(`SELECT * FROM rate_contracts ${branchCondition} ORDER BY from_city, to_city, effective_from DESC`);
    res.json({ data: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/rates', authMiddleware, async (req, res) => {
  try {
    const r = { ...req.body }; if (!r.branch_id) r.branch_id = req.user.branch_id; if (!r.created_by) r.created_by = req.user.username;
    const keys = Object.keys(r); const values = Object.values(r);
    const row = await pool.query(`INSERT INTO rate_contracts (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`, values);
    res.json(row.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/rates/:id', authMiddleware, async (req, res) => {
  try {
    const id = req.params.id; const data = { ...req.body }; delete data.id; delete data.created_at; data.updated_at = new Date().toISOString();
    const keys = Object.keys(data); const values = Object.values(data);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', '); values.push(id);
    const result = await pool.query(`UPDATE rate_contracts SET ${setClause} WHERE id = $${values.length} RETURNING *`, values);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/rates/:id', authMiddleware, async (req, res) => {
  try { await pool.query('DELETE FROM rate_contracts WHERE id = $1', [req.params.id]); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/rates/calculate', authMiddleware, async (req, res) => {
  try {
    const { from_city, to_city, weight_kg, packages, party_code } = req.body;
    if (!from_city || !to_city) return res.status(400).json({ error: 'From and To cities are required' });
    const today = new Date().toISOString().split('T')[0];
    let query = `SELECT * FROM rate_contracts WHERE from_city = $1 AND to_city = $2 AND effective_from <= $3 AND (effective_to IS NULL OR effective_to >= $3) AND COALESCE(is_active, TRUE) = TRUE`;
    const params = [from_city, to_city, today];
    if (party_code) { query += ` AND (party_code = $4 OR party_code IS NULL)`; params.push(party_code); }
    if (req.user.role !== 'admin') {
      query += ` AND branch_id = $${params.length + 1}`;
      params.push(req.user.branch_id);
    }
    query += ` ORDER BY party_code DESC NULLS LAST, weight_from DESC LIMIT 1`;
    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.json({ found: false, message: 'No rate contract found', freight: 0 });
    const rate = result.rows[0]; let freight = 0;
    if (rate.rate_type === 'per_kg' && weight_kg) freight = parseFloat(weight_kg) * parseFloat(rate.rate_per_kg);
    else if (rate.rate_type === 'per_pkg' && packages) freight = parseFloat(packages) * parseFloat(rate.rate_per_pkg);
    else if (rate.rate_type === 'fixed') freight = parseFloat(rate.fixed_rate || 0);
    if (rate.min_charge && freight < parseFloat(rate.min_charge)) freight = parseFloat(rate.min_charge);
    res.json({ found: true, rate_contract: rate, freight: Math.round(freight * 100) / 100, calculation: { weight_kg, packages, rate_applied: rate.rate_type === 'per_kg' ? rate.rate_per_kg : rate.rate_per_pkg, min_charge: rate.min_charge } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// ADVANCED ACCOUNTING MODULE
// ==========================================
app.get('/api/accounts/summary', authMiddleware, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const branchCondition = isAdmin ? '' : `AND branch_id = ${parseInt(req.user.branch_id)}`;
    const branchWhere = isAdmin ? '' : `WHERE branch_id = ${parseInt(req.user.branch_id)}`;
    const receivableRes = await pool.query(`SELECT COALESCE(SUM(CAST(grand_total AS NUMERIC)), 0) as total FROM consignments WHERE COALESCE(payment_status, 'Unpaid') = 'Unpaid' ${branchCondition}`);
    const payableRes = await pool.query(`SELECT COALESCE(SUM(balance_due), 0) as total FROM gadi_challans WHERE balance_due > 0 ${branchCondition}`);
    const revenueRes = await pool.query(`SELECT COALESCE(SUM(CAST(grand_total AS NUMERIC)), 0) as total FROM consignments WHERE COALESCE(payment_status, 'Unpaid') = 'Paid' ${branchCondition}`);
    const expenseRes = await pool.query(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses ${branchWhere}`);
    const tdsRes = await pool.query(`SELECT COALESCE(SUM(tds_deduction), 0) as total FROM gadi_challans ${branchCondition}`);
    res.json({
      success: true, data: {
        total_receivable: parseFloat(receivableRes.rows[0].total || 0), total_payable: parseFloat(payableRes.rows[0].total || 0),
        total_revenue: parseFloat(revenueRes.rows[0].total || 0), total_expenses: parseFloat(expenseRes.rows[0].total || 0),
        tds_pending: parseFloat(tdsRes.rows[0].total || 0), net_profit: parseFloat(revenueRes.rows[0].total || 0) - parseFloat(expenseRes.rows[0].total || 0)
      }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/accounts/tds-register', authMiddleware, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const branchCondition = isAdmin ? `WHERE tds_deduction > 0` : `WHERE branch_id = ${parseInt(req.user.branch_id)} AND tds_deduction > 0`;
    const result = await pool.query(`SELECT challan_no, issue_date, broker_name, freight_amount, tds_deduction, net_payable FROM gadi_challans ${branchCondition} ORDER BY issue_date DESC LIMIT 200`);
    res.json({ data: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// E-WAY BILL MODULE
// ==========================================
app.get('/api/eway-bills', authMiddleware, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const branchCondition = isAdmin ? '' : `AND c.branch_id = ${parseInt(req.user.branch_id)}`;
    const result = await pool.query(`SELECT c.id, c.lr_no, c.lr_date, c.consignor_name, c.consignee_name, c.from_name, c.to_name, c.declared_value, c.eway_bill_no, c.eway_valid_upto, c.transporter_id, c.transporter_name, c.status, c.from_state, c.to_state FROM consignments c WHERE CAST(c.declared_value AS NUMERIC) > CASE WHEN c.from_state IS NOT NULL AND c.to_state IS NOT NULL AND UPPER(TRIM(c.from_state)) = UPPER(TRIM(c.to_state)) THEN 100000 ELSE 50000 END ${branchCondition} ORDER BY c.lr_date DESC LIMIT 200`);
    res.json({ data: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/eway-bills/:id', authMiddleware, async (req, res) => {
  try {
    const id = req.params.id; const { eway_bill_no, eway_valid_upto, transporter_id, transporter_name } = req.body;
    const result = await pool.query(`UPDATE consignments SET eway_bill_no = $1, eway_valid_upto = $2, transporter_id = $3, transporter_name = $4, updated_at = NOW() WHERE id = $5 RETURNING id, lr_no, eway_bill_no`, [eway_bill_no || null, eway_valid_upto || null, transporter_id || null, transporter_name || null, id]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// USER MANAGEMENT MODULE
// ==========================================
app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admin can view all users' });
    const result = await pool.query(`SELECT u.id, u.username, u.email, u.full_name, u.role, u.branch_id, COALESCE(u.is_active, TRUE) as is_active, u.created_at, b.branch_code, b.branch_name, b.city FROM users u LEFT JOIN branches b ON u.branch_id = b.id ORDER BY u.created_at DESC`);
    res.json({ data: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/users', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admin can create users' });
    const { username, email, password, full_name, role, branch_id } = req.body;
    if (!username || !password || !full_name || !role) return res.status(400).json({ error: 'All fields are required' });
    const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Username already exists' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(`INSERT INTO users (username, email, password, full_name, role, branch_id, is_active) VALUES ($1, $2, $3, $4, $5, $6, TRUE) RETURNING id, username, email, full_name, role, branch_id`, [username, email || null, hashedPassword, full_name, role, branch_id || null]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/users/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admin can update users' });
    const id = req.params.id; const { full_name, email, role, branch_id, is_active, password } = req.body;
    let query = `UPDATE users SET full_name = $1, email = $2, role = $3, branch_id = $4, is_active = $5`;
    const params = [full_name, email || null, role, branch_id || null, is_active !== undefined ? is_active : true];
    let paramCount = 5;
    if (password) { paramCount++; const hashedPassword = await bcrypt.hash(password, 10); query += `, password = $${paramCount}`; params.push(hashedPassword); }
    paramCount++; query += ` WHERE id = $${paramCount} RETURNING id, username, email, full_name, role, branch_id, is_active`; params.push(id);
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/users/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admin can delete users' });
    const id = req.params.id;
    if (parseInt(id) === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });
    await pool.query('UPDATE users SET is_active = FALSE WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 💾 BACKUP & RESTORE MODULE (Local D: Drive Support)
// ==========================================
app.get('/api/backup/export', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admin can backup data' });
    console.log('📦 Starting full database backup...');
    
    const tables = [
      'branches', 'users', 'parties', 'customers', 'drivers', 'vehicles', 
      'freight_rates', 'materials', 'routes', 'consignments', 'bill_book', 
      'bill_items', 'money_receipts', 'party_ledger', 'expenses', 'claims', 
      'commissions', 'audit_logs', 'gate_passes', 'gadi_challans', 'trips', 
      'rate_contracts', 'manifests', 'manifest_items', 'pod_records'
    ];

    const backupData = {
      backup_date: new Date().toISOString(),
      software_version: '6.0',
      taken_by: req.user.username,
      data: {}
    };

    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT * FROM ${table}`);
        backupData.data[table] = result.rows;
        console.log(`  ✅ Backed up ${table}: ${result.rows.length} records`);
      } catch (err) {
        console.warn(`  ⚠️ Skipped ${table}:`, err.message);
        backupData.data[table] = [];
      }
    }

    res.json({ success: true, message: 'Backup generated successfully', data: backupData });
  } catch (err) {
    console.error('Backup error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/backup/import', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admin can restore data' });
    const backupData = req.body.data;
    if (!backupData || !backupData.data) return res.status(400).json({ error: 'Invalid backup file format' });

    console.log('🔄 Starting data restore...');
    let totalRecords = 0;

    for (const [table, rows] of Object.entries(backupData.data)) {
      if (Array.isArray(rows) && rows.length > 0) {
        try {
          await pool.query(`DELETE FROM ${table}`);
          const keys = Object.keys(rows[0]);
          for (const row of rows) {
            const values = keys.map(k => row[k]);
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
            await pool.query(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`, values);
          }
          totalRecords += rows.length;
          console.log(`  ✅ Restored ${table}: ${rows.length} records`);
        } catch (err) {
          console.error(`  ❌ Error restoring ${table}:`, err.message);
        }
      }
    }

    res.json({ success: true, message: `Restore completed! Total ${totalRecords} records imported.` });
  } catch (err) {
    console.error('Restore error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// START SERVER
// ==========================================
async function ensureAdminUser() {
  try {
    const username = process.env.INITIAL_ADMIN_USERNAME;
    const password = process.env.INITIAL_ADMIN_PASSWORD;
    const email = process.env.INITIAL_ADMIN_EMAIL || null;
    if (!username || !password) {
      console.warn('Initial admin bootstrap skipped: set INITIAL_ADMIN_USERNAME and INITIAL_ADMIN_PASSWORD to create one.');
      return;
    }

    const result = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(
        `INSERT INTO users (username, password, email, full_name, role, is_active)
         VALUES ($1, $2, $3, $4, $5, TRUE)`,
        [username, hashedPassword, email, 'Administrator', 'admin']
      );
    }
  } catch (err) { console.error('Admin setup error:', err.message); }
}

async function startServer() {
  await runMigrations();
  await ensureAdminUser();
  app.listen(PORT, HOST, () => {
    console.log(`✅ Bharat Transport TMS v6.0 running on port ${PORT}`);
  });
}

// ==========================================
// 🔧 MIGRATION: Fix existing branches (one-time)
// ==========================================
app.post('/api/migrate/fix-branches', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    
    const branches = await pool.query(
      `SELECT id, branch_name, incharge_name FROM branches WHERE url_slug IS NULL OR incharge_username IS NULL`
    );
    
    let fixed = 0;
    for (const branch of branches.rows) {
      const slug = branch.branch_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const username = `incharge_${slug}`;
      
      await pool.query(
        `UPDATE branches SET url_slug = $1, incharge_username = $2 WHERE id = $3`,
        [slug, username, branch.id]
      );
      fixed++;
    }
    
    res.json({ success: true, fixed, message: `${fixed} branches fixed!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
startServer();
module.exports = app;

// ==========================================
// BILL NUMBER GENERATION ENDPOINT
// ==========================================
app.get('/api/bills/next-number', authMiddleware, async (req, res) => {
  try {
    const year = String(new Date().getFullYear()).slice(-2);
    const result = await pool.query(
      `SELECT bill_no FROM bill_book WHERE bill_no LIKE $1 ORDER BY id DESC LIMIT 1`,
      [`BILL/${year}/%`]
    );
    
    let nextSerial = 1;
    if (result.rows.length > 0 && result.rows[0].bill_no) {
      const parts = result.rows[0].bill_no.split('/');
      if (parts.length === 3) {
        nextSerial = parseInt(parts[2]) + 1;
      }
    }
    
    const nextBillNo = `BILL/${year}/${String(nextSerial).padStart(4, '0')}`;
    res.json({ bill_no: nextBillNo });
  } catch (err) {
    console.error('Bill number generation error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
