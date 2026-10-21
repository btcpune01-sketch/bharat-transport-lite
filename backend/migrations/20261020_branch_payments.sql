BEGIN;

CREATE TABLE IF NOT EXISTS branch_payments (
  id BIGSERIAL PRIMARY KEY,
  branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  branch_name TEXT NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL CHECK (type IN ('given', 'received')),
  payment_mode TEXT NOT NULL CHECK (payment_mode IN ('Cash', 'UPI', 'Bank')),
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS branch_ledger (
  id BIGSERIAL PRIMARY KEY,
  branch_id INTEGER NOT NULL UNIQUE REFERENCES branches(id) ON DELETE RESTRICT,
  branch_name TEXT NOT NULL,
  total_given NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_received NUMERIC(14,2) NOT NULL DEFAULT 0,
  current_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS branch_payments_branch_name_idx
  ON branch_payments (branch_name);
CREATE INDEX IF NOT EXISTS branch_payments_branch_date_idx
  ON branch_payments (branch_id, payment_date DESC, created_at DESC);

CREATE OR REPLACE FUNCTION sync_branch_ledger_from_payment()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO branch_ledger (
    branch_id, branch_name, total_given, total_received, current_balance, last_updated
  )
  VALUES (
    NEW.branch_id,
    NEW.branch_name,
    CASE WHEN NEW.type = 'given' THEN NEW.amount ELSE 0 END,
    CASE WHEN NEW.type = 'received' THEN NEW.amount ELSE 0 END,
    CASE WHEN NEW.type = 'given' THEN NEW.amount ELSE -NEW.amount END,
    NOW()
  )
  ON CONFLICT (branch_id) DO UPDATE SET
    branch_name = EXCLUDED.branch_name,
    total_given = branch_ledger.total_given + EXCLUDED.total_given,
    total_received = branch_ledger.total_received + EXCLUDED.total_received,
    current_balance = (branch_ledger.total_given + EXCLUDED.total_given)
      - (branch_ledger.total_received + EXCLUDED.total_received),
    last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS branch_payments_sync_ledger ON branch_payments;
CREATE TRIGGER branch_payments_sync_ledger
AFTER INSERT ON branch_payments
FOR EACH ROW EXECUTE FUNCTION sync_branch_ledger_from_payment();

INSERT INTO branch_ledger (
  branch_id, branch_name, total_given, total_received, current_balance, last_updated
)
SELECT
  p.branch_id,
  COALESCE(MAX(b.branch_name), MAX(p.branch_name)),
  COALESCE(SUM(CASE WHEN p.type = 'given' THEN p.amount ELSE 0 END), 0),
  COALESCE(SUM(CASE WHEN p.type = 'received' THEN p.amount ELSE 0 END), 0),
  COALESCE(SUM(CASE WHEN p.type = 'given' THEN p.amount ELSE -p.amount END), 0),
  NOW()
FROM branch_payments p
LEFT JOIN branches b ON b.id = p.branch_id
GROUP BY p.branch_id
ON CONFLICT (branch_id) DO UPDATE SET
  branch_name = EXCLUDED.branch_name,
  total_given = EXCLUDED.total_given,
  total_received = EXCLUDED.total_received,
  current_balance = EXCLUDED.current_balance,
  last_updated = NOW();

COMMIT;
