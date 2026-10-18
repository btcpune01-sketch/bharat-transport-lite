-- ============================================
-- BHARAT TRANSPORT COMPANY - COMPLETE DATABASE
-- Version 2.0 (Full + Fixed)
-- Date: 2026
-- ============================================

-- ============================================
-- PART 1: MASTER DATA (9 TABLES)
-- ============================================

-- 1. USERS (Admin + Branch + Accountant)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'branch',
    branch_code VARCHAR(20),
    mobile VARCHAR(15),
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. BRANCHES
CREATE TABLE IF NOT EXISTS branches (
    id SERIAL PRIMARY KEY,
    branch_code VARCHAR(20) UNIQUE NOT NULL,
    branch_name VARCHAR(100) NOT NULL,
    address TEXT,
    city VARCHAR(50),
    state VARCHAR(50),
    pincode VARCHAR(10),
    mobile VARCHAR(15),
    email VARCHAR(100),
    gst_no VARCHAR(20),
    manager_name VARCHAR(100),
    branch_login_enabled BOOLEAN DEFAULT FALSE,
    login_credentials JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. CUSTOMERS (Parties)
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    customer_code VARCHAR(20) UNIQUE,
    customer_name VARCHAR(200) NOT NULL,
    address TEXT,
    city VARCHAR(50),
    state VARCHAR(50),
    pincode VARCHAR(10),
    mobile VARCHAR(15),
    whatsapp VARCHAR(15),
    email VARCHAR(100),
    gst_no VARCHAR(20),
    pan_no VARCHAR(20),
    customer_type VARCHAR(20) DEFAULT 'credit',
    credit_limit NUMERIC(12,2) DEFAULT 0,
    credit_days INTEGER DEFAULT 0,
    opening_balance NUMERIC(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. VENDORS (Hired Vehicle Owners)
CREATE TABLE IF NOT EXISTS vendors (
    id SERIAL PRIMARY KEY,
    vendor_code VARCHAR(20) UNIQUE,
    vendor_name VARCHAR(200) NOT NULL,
    address TEXT,
    mobile VARCHAR(15),
    email VARCHAR(100),
    gst_no VARCHAR(20),
    pan_no VARCHAR(20),
    bank_name VARCHAR(100),
    bank_ac VARCHAR(50),
    bank_ifsc VARCHAR(20),
    opening_balance NUMERIC(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. DRIVERS
CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,
    driver_name VARCHAR(100) NOT NULL,
    mobile VARCHAR(15),
    license_no VARCHAR(50),
    license_expiry DATE,
    aadhaar_no VARCHAR(20),
    address TEXT,
    date_of_birth DATE,
    blood_group VARCHAR(10),
    emergency_contact VARCHAR(15),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. VEHICLES (Owned + Hired)
CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    vehicle_no VARCHAR(20) UNIQUE NOT NULL,
    vehicle_type VARCHAR(50),
    owner_type VARCHAR(20) DEFAULT 'hired',
    owner_vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
    capacity_mt NUMERIC(8,2),
    rc_no VARCHAR(50),
    insurance_no VARCHAR(50),
    insurance_expiry DATE,
    fitness_expiry DATE,
    permit_expiry DATE,
    pollution_expiry DATE,
    gps_device_id VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. ITEMS / COMMODITY MASTER
CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    item_code VARCHAR(30) UNIQUE,
    item_name VARCHAR(200) NOT NULL,
    hsn_code VARCHAR(20),
    unit VARCHAR(20) DEFAULT 'MT',
    category VARCHAR(50),
    default_rate NUMERIC(10,2),
    is_fragile BOOLEAN DEFAULT FALSE,
    is_hazardous BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. ROUTES
CREATE TABLE IF NOT EXISTS routes (
    id SERIAL PRIMARY KEY,
    from_code VARCHAR(20),
    to_code VARCHAR(20),
    distance_km NUMERIC(8,2),
    transit_days INTEGER,
    toll_estimate NUMERIC(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(from_code, to_code)
);

-- 9. RATE CHART (Party-wise, Route-wise)
CREATE TABLE IF NOT EXISTS rate_chart (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    from_code VARCHAR(20),
    to_code VARCHAR(20),
    item_category VARCHAR(50),
    weight_from NUMERIC(10,2),
    weight_to NUMERIC(10,2),
    rate_per_mt NUMERIC(10,2),
    min_charges NUMERIC(10,2) DEFAULT 0,
    aoc_percent NUMERIC(5,2) DEFAULT 0,
    eov_percent NUMERIC(5,2) DEFAULT 0,
    cover_charges NUMERIC(12,2) DEFAULT 0,
    door_delivery NUMERIC(12,2) DEFAULT 0,
    effective_from DATE,
    effective_to DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- ============================================
-- PART 2: BILTY (LR) + BILLING (4 TABLES)
-- ============================================

-- 10. CONSIGNMENTS (LR / Bilty)
CREATE TABLE IF NOT EXISTS consignments (
    id SERIAL PRIMARY KEY,
    lr_no VARCHAR(30) UNIQUE NOT NULL,
    lr_date DATE NOT NULL,
    branch_code VARCHAR(20),
    
    -- Consignor
    consignor_name VARCHAR(200),
    consignor_address TEXT,
    consignor_gst VARCHAR(20),
    consignor_mobile VARCHAR(15),
    
    -- Consignee
    consignee_name VARCHAR(200),
    consignee_address TEXT,
    consignee_gst VARCHAR(20),
    consignee_mobile VARCHAR(15),
    
    -- Invoice
    invoice_no VARCHAR(50),
    invoice_date DATE,
    
    -- Route
    from_code VARCHAR(20),
    from_name TEXT,
    to_code VARCHAR(20),
    to_name TEXT,
    
    -- Vehicle / Driver
    lorry_no VARCHAR(20),
    driver_name VARCHAR(100),
    driver_mobile VARCHAR(15),
    driver_id INTEGER,
    vehicle_id INTEGER,
    
    -- Delivery
    delivery_type VARCHAR(30) DEFAULT 'Door Delivery',
    pickup_address TEXT,
    delivery_godown TEXT,
    unloading_party_mobile VARCHAR(15),
    
    -- Package
    no_of_packages INTEGER,
    method_of_packing VARCHAR(50),
    package_type TEXT,
    hsn_code VARCHAR(20),
    description TEXT,
    actual_weight NUMERIC(10,2),
    charged_weight NUMERIC(10,2),
    rate NUMERIC(10,2),
    
    -- Dimensions
    length NUMERIC(8,2),
    width NUMERIC(8,2),
    height NUMERIC(8,2),
    dimension_pkgs INTEGER,
    cft_cmt NUMERIC(10,2),
    distance_km NUMERIC(8,2),
    
    -- Private Marks / MR
    private_marks TEXT,
    mr_active BOOLEAN NOT NULL DEFAULT FALSE,
    mr_party_name VARCHAR(200),
    mr_no VARCHAR(50),
    mr_date DATE,
    mr_amount NUMERIC(12,2) DEFAULT 0,
    mr_payment_mode VARCHAR(30),
    mr_remarks TEXT,
    mr_party_type VARCHAR(30),
    mr_is_advance BOOLEAN DEFAULT FALSE,
    mr_bilty_id INTEGER,
    mr_bilty_lr_no VARCHAR(50),
    mr_bill_id INTEGER,
    mr_bill_no VARCHAR(50),
    mr_created_by VARCHAR(100),
    load_type VARCHAR(30),
    
    -- Charges
    freight NUMERIC(12,2) DEFAULT 0,
    aoc_percent NUMERIC(5,2) DEFAULT 0,
    aoc_amount NUMERIC(12,2) DEFAULT 0,
    eov_charges NUMERIC(12,2) DEFAULT 0,
    cover_charges NUMERIC(12,2) DEFAULT 0,
    material_charges NUMERIC(12,2) DEFAULT 0,
    mgmt_charges NUMERIC(12,2) DEFAULT 0,
    collection_charges NUMERIC(12,2) DEFAULT 0,
    door_delivery NUMERIC(12,2) DEFAULT 0,
    with_pass_cc NUMERIC(12,2) DEFAULT 0,
    enroute_charges NUMERIC(12,2) DEFAULT 0,
    statistical_charges NUMERIC(12,2) DEFAULT 0,
    misc_charges NUMERIC(12,2) DEFAULT 0,
    grand_total NUMERIC(12,2) DEFAULT 0,
    
    -- E-way Bill
    eway_bill_no VARCHAR(30),
    eway_valid_upto DATE,
    
    -- Payment
    payment_type VARCHAR(20),
    declared_value NUMERIC(12,2),
    basis_of_booking INTEGER,
    billed_at VARCHAR(200),
    gst_through VARCHAR(30),
    to_pay_paid_tbb_amount NUMERIC(12,2),
    amount_in_words VARCHAR(500),
    
    -- Status
    status VARCHAR(30) DEFAULT 'Booked',
    
    -- WhatsApp
    whatsapp_sent BOOLEAN DEFAULT FALSE,
    whatsapp_sent_at TIMESTAMP,
    
    remarks TEXT,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast search
CREATE INDEX IF NOT EXISTS idx_consignments_lr_no ON consignments(lr_no);
CREATE INDEX IF NOT EXISTS idx_consignments_lr_date ON consignments(lr_date);
CREATE INDEX IF NOT EXISTS idx_consignments_status ON consignments(status);
CREATE INDEX IF NOT EXISTS idx_consignments_to_code ON consignments(to_code);
CREATE INDEX IF NOT EXISTS idx_consignments_consignee_mobile ON consignments(consignee_mobile);

-- 11. BILL BOOK (Invoice)
CREATE TABLE IF NOT EXISTS bill_book (
    id SERIAL PRIMARY KEY,
    bill_no VARCHAR(30) UNIQUE NOT NULL,
    bill_date DATE NOT NULL,
    branch_code VARCHAR(20),
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    party_name TEXT,
    party_gst TEXT,
    party_address TEXT,
    invoice_no VARCHAR(50),
    invoice_date DATE,
    from_name TEXT,
    to_name TEXT,
    consignor_name TEXT,
    consignee_name TEXT,
    vehicle_no TEXT,
    grand_total NUMERIC(12,2) DEFAULT 0,
    advance_received NUMERIC(12,2) DEFAULT 0,
    balance_due NUMERIC(12,2) DEFAULT 0,
    trip_subtotal NUMERIC(12,2) DEFAULT 0,
    gst_percent NUMERIC(5,2) DEFAULT 0,
    gst_amount NUMERIC(12,2) DEFAULT 0,
    net_balance NUMERIC(12,2) DEFAULT 0,
    payment_mode VARCHAR(30),
    payment_details TEXT,
    amount_in_words VARCHAR(500),
    status VARCHAR(20) DEFAULT 'Active',
    remarks TEXT,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. BILL ITEMS
CREATE TABLE IF NOT EXISTS bill_items (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER REFERENCES bill_book(id) ON DELETE CASCADE,
    lr_no VARCHAR(30),
    invoice_no VARCHAR(50),
    from_name TEXT,
    to_name TEXT,
    weight_mt NUMERIC(10,2),
    loading NUMERIC(12,2) DEFAULT 0,
    unloading NUMERIC(12,2) DEFAULT 0,
    other_charges NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) DEFAULT 0
);

-- 13. BILL PAYMENTS
CREATE TABLE IF NOT EXISTS bill_payments (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER REFERENCES bill_book(id) ON DELETE CASCADE,
    payment_date DATE,
    amount NUMERIC(12,2),
    payment_mode VARCHAR(30),
    reference_no VARCHAR(50),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- ============================================
-- PART 3: TRIP + STOCK + ACCOUNTING + SYSTEM (20 TABLES)
-- ============================================

-- 14. TRIPS / MANIFEST
CREATE TABLE IF NOT EXISTS trips (
    id SERIAL PRIMARY KEY,
    trip_no VARCHAR(30) UNIQUE NOT NULL,
    trip_date DATE NOT NULL,
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
    vehicle_no VARCHAR(20),
    driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
    driver_name VARCHAR(100),
    from_code VARCHAR(20),
    to_code VARCHAR(20),
    start_km NUMERIC(10,2),
    end_km NUMERIC(10,2),
    total_km NUMERIC(10,2),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Running',
    remarks TEXT,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. TRIP CONSIGNMENTS (Junction Table)
CREATE TABLE IF NOT EXISTS trip_consignments (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
    consignment_id INTEGER REFERENCES consignments(id) ON DELETE CASCADE,
    loaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 16. TRIP EXPENSES
CREATE TABLE IF NOT EXISTS trip_expenses (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
    expense_date DATE NOT NULL,
    expense_type VARCHAR(50),
    amount NUMERIC(12,2) NOT NULL,
    paid_to VARCHAR(200),
    reference_no VARCHAR(50),
    remarks TEXT,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17. DRIVER ADVANCES
CREATE TABLE IF NOT EXISTS driver_advances (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
    trip_id INTEGER REFERENCES trips(id) ON DELETE SET NULL,
    advance_date DATE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    payment_mode VARCHAR(30),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 18. VEHICLE MAINTENANCE
CREATE TABLE IF NOT EXISTS vehicle_maintenance (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
    maintenance_date DATE NOT NULL,
    maintenance_type VARCHAR(50),
    description TEXT,
    cost NUMERIC(12,2) DEFAULT 0,
    vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
    next_due_date DATE,
    next_due_km NUMERIC(10,2),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ACCOUNTING (5 TABLES)
-- ============================================

-- 19. PAYMENTS (Party से पैसा मिला)
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    payment_no VARCHAR(30) UNIQUE,
    payment_date DATE NOT NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    party_name VARCHAR(200),
    amount NUMERIC(12,2) NOT NULL,
    payment_mode VARCHAR(30),
    reference_no VARCHAR(50),
    bank_name VARCHAR(100),
    branch_code VARCHAR(20),
    against_bill_no VARCHAR(30),
    remarks TEXT,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 20. VENDOR PAYMENTS (Vendor को पैसा दिया)
CREATE TABLE IF NOT EXISTS vendor_payments (
    id SERIAL PRIMARY KEY,
    payment_no VARCHAR(30) UNIQUE,
    payment_date DATE NOT NULL,
    vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
    vendor_name VARCHAR(200),
    amount NUMERIC(12,2) NOT NULL,
    payment_mode VARCHAR(30),
    reference_no VARCHAR(50),
    bank_name VARCHAR(100),
    against_trip_no VARCHAR(30),
    remarks TEXT,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 21. LEDGER (Party-wise पूरा हिसाब)
CREATE TABLE IF NOT EXISTS ledger (
    id SERIAL PRIMARY KEY,
    entry_date DATE NOT NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    party_name VARCHAR(200),
    entry_type VARCHAR(30),
    reference_no VARCHAR(50),
    debit NUMERIC(12,2) DEFAULT 0,
    credit NUMERIC(12,2) DEFAULT 0,
    balance NUMERIC(12,2) DEFAULT 0,
    remarks TEXT,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 22. EXPENSES (Office / General Expenses)
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    expense_date DATE NOT NULL,
    expense_category VARCHAR(50),
    description TEXT,
    amount NUMERIC(12,2) NOT NULL,
    paid_to VARCHAR(200),
    payment_mode VARCHAR(30),
    reference_no VARCHAR(50),
    branch_code VARCHAR(20),
    remarks TEXT,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 23. GST / TAX RECORDS
CREATE TABLE IF NOT EXISTS gst_records (
    id SERIAL PRIMARY KEY,
    record_date DATE NOT NULL,
    record_type VARCHAR(30),
    gst_no VARCHAR(20),
    party_name VARCHAR(200),
    invoice_no VARCHAR(50),
    taxable_amount NUMERIC(12,2),
    cgst NUMERIC(12,2) DEFAULT 0,
    sgst NUMERIC(12,2) DEFAULT 0,
    igst NUMERIC(12,2) DEFAULT 0,
    total_gst NUMERIC(12,2) DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STOCK MANAGEMENT (3 TABLES) - नया!
-- ============================================

-- 24. STOCK ITEMS MASTER
CREATE TABLE IF NOT EXISTS stock_items (
    id SERIAL PRIMARY KEY,
    item_code VARCHAR(30) UNIQUE,
    item_name VARCHAR(100) NOT NULL,
    item_type VARCHAR(30),
    unit VARCHAR(20) DEFAULT 'sheets',
    min_level INTEGER DEFAULT 50,
    critical_level INTEGER DEFAULT 20,
    urgent_level INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document book purchases are stored separately from usage, which is counted
-- from the corresponding operational document tables by the API.
CREATE TABLE IF NOT EXISTS document_stock (
    id SERIAL PRIMARY KEY,
    document_type TEXT UNIQUE NOT NULL,
    total_stock INTEGER DEFAULT 0,
    used_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT NOW()
);

INSERT INTO document_stock (document_type, total_stock) VALUES
    ('bilty', 500),
    ('mr', 500),
    ('gadi_challan', 500),
    ('billing', 1500),
    ('gate_pass', 300),
    ('pod', 300)
ON CONFLICT (document_type) DO NOTHING;

-- 25. STOCK TRANSACTIONS (हर IN/OUT)
CREATE TABLE IF NOT EXISTS stock_transactions (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES stock_items(id) ON DELETE CASCADE,
    branch_code VARCHAR(20),
    transaction_type VARCHAR(20),
    quantity INTEGER,
    serial_from VARCHAR(30),
    serial_to VARCHAR(30),
    reference_no VARCHAR(50),
    transaction_date DATE,
    supplier VARCHAR(200),
    remarks TEXT,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 26. STOCK ALERTS
CREATE TABLE IF NOT EXISTS stock_alerts (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES stock_items(id) ON DELETE CASCADE,
    branch_code VARCHAR(20),
    current_stock INTEGER,
    alert_level VARCHAR(20),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SYSTEM TABLES (6 TABLES)
-- ============================================

-- 27. E-WAY BILLS
CREATE TABLE IF NOT EXISTS eway_bills (
    id SERIAL PRIMARY KEY,
    eway_bill_no VARCHAR(30) UNIQUE,
    eway_date DATE,
    valid_upto DATE,
    lr_no VARCHAR(30),
    from_gst VARCHAR(20),
    to_gst VARCHAR(20),
    vehicle_no VARCHAR(20),
    transporter_id VARCHAR(30),
    distance_km NUMERIC(8,2),
    taxable_value NUMERIC(12,2),
    total_value NUMERIC(12,2),
    status VARCHAR(20) DEFAULT 'Active',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 28. POD (Proof of Delivery)
CREATE TABLE IF NOT EXISTS pod (
    id SERIAL PRIMARY KEY,
    lr_no VARCHAR(30),
    delivery_date DATE,
    received_by VARCHAR(200),
    receiver_mobile VARCHAR(15),
    signature_url TEXT,
    photo_url TEXT,
    delivery_remarks TEXT,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 29. DELIVERY STATUS HISTORY
CREATE TABLE IF NOT EXISTS delivery_status (
    id SERIAL PRIMARY KEY,
    lr_no VARCHAR(30),
    status VARCHAR(30),
    location VARCHAR(100),
    remarks TEXT,
    updated_by VARCHAR(50),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 30. NOTIFICATIONS (WhatsApp / SMS Log)
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    notification_type VARCHAR(30),
    recipient_mobile VARCHAR(15),
    recipient_name VARCHAR(200),
    reference_no VARCHAR(50),
    message TEXT,
    status VARCHAR(20) DEFAULT 'Sent',
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50)
);

-- 31. AUDIT LOG (किसने क्या बदला)
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    username VARCHAR(50),
    action VARCHAR(50),
    table_name VARCHAR(50),
    record_id INTEGER,
    old_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 32. SETTINGS (Company + WhatsApp + Charges)
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(50) UNIQUE,
    setting_value TEXT,
    setting_type VARCHAR(30) DEFAULT 'text',
    category VARCHAR(30) DEFAULT 'general',
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 33. FINANCIAL YEARS (Bilty numbering के लिए)
CREATE TABLE IF NOT EXISTS financial_years (
    id SERIAL PRIMARY KEY,
    fy_code VARCHAR(10) UNIQUE,
    start_date DATE,
    end_date DATE,
    last_bilty_serial INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SAMPLE DATA
-- ============================================

-- Create the initial administrator through the backend's
-- INITIAL_ADMIN_USERNAME / INITIAL_ADMIN_PASSWORD environment settings.

-- Sample Branches (15)
INSERT INTO branches (branch_code, branch_name, address, city, state, pincode, mobile, gst_no) VALUES
('RAJ', 'Rajgarh (Head Office)', 'Ward No. 17, Purana Falsa, Pilani Road', 'Rajgarh', 'Rajasthan', '331023', '9680264231', '08CMRPP0955N1Z5'),
('DEL', 'Delhi', 'Karol Bagh', 'Delhi', 'Delhi', '110005', '', ''),
('MUM', 'Mumbai', 'Andheri East', 'Mumbai', 'Maharashtra', '400069', '', ''),
('JAI', 'Jaipur', 'Transport Nagar', 'Jaipur', 'Rajasthan', '302003', '', ''),
('AHM', 'Ahmedabad', 'Naroda', 'Ahmedabad', 'Gujarat', '382330', '', ''),
('PUN', 'Pune', 'Hadapsar', 'Pune', 'Maharashtra', '411028', '', ''),
('SUR', 'Surat', 'Udhna', 'Surat', 'Gujarat', '394210', '', ''),
('IND', 'Indore', 'Vijay Nagar', 'Indore', 'Madhya Pradesh', '452010', '', ''),
('BHO', 'Bhopal', 'Bairagarh', 'Bhopal', 'Madhya Pradesh', '462030', '', ''),
('NAG', 'Nagpur', 'Central Avenue', 'Nagpur', 'Maharashtra', '440018', '', ''),
('KOL', 'Kolkata', 'Howrah', 'Kolkata', 'West Bengal', '700001', '', ''),
('CHE', 'Chennai', 'Parrys', 'Chennai', 'Tamil Nadu', '600001', '', ''),
('BAN', 'Bangalore', 'Yeshwanthpur', 'Bangalore', 'Karnataka', '560022', '', ''),
('HYD', 'Hyderabad', 'Kukatpally', 'Hyderabad', 'Telangana', '500072', '', ''),
('LUC', 'Lucknow', 'Alambagh', 'Lucknow', 'Uttar Pradesh', '226005', '', '')
ON CONFLICT (branch_code) DO NOTHING;

-- Sample Customers (3)
INSERT INTO customers (customer_code, customer_name, address, city, state, mobile, gst_no, customer_type) VALUES
('CUST001', 'Vedant Sales Corporation', 'Main Market', 'Rajgarh', 'Rajasthan', '', '27AVGPG9369R1ZJ', 'credit'),
('CUST002', 'Electromech Infraprojects Pvt Ltd', 'Andheri East', 'Mumbai', 'Maharashtra', '', '', 'credit'),
('CUST003', 'Shree Traders', 'Transport Nagar', 'Jaipur', 'Rajasthan', '', '', 'cash')
ON CONFLICT (customer_code) DO NOTHING;

-- Stock Items (Default)
INSERT INTO stock_items (item_code, item_name, item_type, unit, min_level, critical_level, urgent_level) VALUES
('STK001', 'Bilty Book', 'bilty', 'sheets', 50, 20, 10),
('STK002', 'Bill Book', 'bill', 'sheets', 50, 20, 10),
('STK003', 'Money Receipt (MR)', 'mr', 'sheets', 50, 20, 10),
('STK004', 'Delivery Challan', 'challan', 'sheets', 50, 20, 10),
('STK005', 'Letterhead', 'other', 'sheets', 100, 50, 20),
('STK006', 'Envelope', 'other', 'pieces', 200, 100, 50)
ON CONFLICT (item_code) DO NOTHING;

-- Settings (Default WhatsApp Template + Company Info)
INSERT INTO settings (setting_key, setting_value, setting_type, category, description) VALUES
('company_name', 'BHARAT TRANSPORT COMPANY', 'text', 'general', 'Company Name'),
('company_address', 'Ward No. 17, Purana Falsa, Pilani Road, Rajgarh, Churu, Rajasthan, 331023', 'text', 'general', 'Head Office Address'),
('company_mobile', '9680264231', 'text', 'general', 'Contact Mobile'),
('company_email', 'bharattransportcompany@gmail.com', 'text', 'general', 'Email'),
('company_gst', '08CMRPP0955N1Z5', 'text', 'general', 'GST Number'),
('company_pan', 'CMRPP0955N', 'text', 'general', 'PAN Number'),
('whatsapp_template_bilty', 'Dear {party_name},\n\nYour Bilty has been created ✅\n\n📋 LR No: {lr_no}\n📅 Date: {lr_date}\n📍 From: {from_name}\n📍 To: {to_name}\n📦 Packages: {packages}\n⚖️ Weight: {weight}\n💰 Freight: ₹{freight}\n💵 Grand Total: ₹{grand_total}\n\n🚚 Vehicle: {vehicle_no}\n👤 Driver: {driver_name} ({driver_mobile})\n\nThank you!\nBharat Transport Company\n📞 9680264231', 'text', 'whatsapp', 'WhatsApp Bilty Message Template'),
('stock_alert_enabled', 'true', 'boolean', 'stock', 'Enable Stock Alerts'),
('default_delivery_type', 'Door Delivery', 'text', 'general', 'Default Delivery Type'),
('default_gst_through', 'CONSIGNEE', 'text', 'general', 'Default GST Through')
ON CONFLICT (setting_key) DO NOTHING;

-- Financial Year (Current)
INSERT INTO financial_years (fy_code, start_date, end_date, last_bilty_serial, is_active) VALUES
('26-27', '2026-04-01', '2027-03-31', 0, TRUE)
ON CONFLICT (fy_code) DO NOTHING;
