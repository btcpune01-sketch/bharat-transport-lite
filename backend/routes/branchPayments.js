const express = require('express');

module.exports = (pool) => {
  const router = express.Router();

  // Auto create table if not exists (PostgreSQL compatible)
  const initTable = async () => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS branch_payments (
          id SERIAL PRIMARY KEY,
          branch VARCHAR(100) NOT NULL,
          amount NUMERIC NOT NULL,
          payment_date TIMESTAMP DEFAULT NOW(),
          payment_mode VARCHAR(50) DEFAULT 'Cash',
          reference VARCHAR(200) DEFAULT '',
          description TEXT DEFAULT '',
          created_by VARCHAR(100) DEFAULT 'Admin',
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
    } catch (e) { 
      console.log('branch_payments table init error:', e.message); 
    }
  };
  
  // Table initialize करें
  initTable();

  // GET /api/branch-payments?branch=Pune
  router.get('/', async (req, res) => {
    try {
      const { branch } = req.query;
      let result;
      if (branch) {
        result = await pool.query('SELECT * FROM branch_payments WHERE branch = $1 ORDER BY payment_date DESC', [branch]);
      } else {
        result = await pool.query('SELECT * FROM branch_payments ORDER BY payment_date DESC');
      }
      const total = result.rows.reduce((sum, r) => sum + parseFloat(r.amount), 0);
      res.json({ payments: result.rows, total });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/branch-payments
  router.post('/', async (req, res) => {
    try {
      const { branch, amount, paymentDate, paymentMode, reference, description, createdBy } = req.body;
      const result = await pool.query(
        `INSERT INTO branch_payments (branch, amount, payment_date, payment_mode, reference, description, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          branch, 
          amount, 
          paymentDate || new Date(), 
          paymentMode || 'Cash', 
          reference || '', 
          description || '', 
          createdBy || 'Admin'
        ]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // DELETE /api/branch-payments/:id
  router.delete('/:id', async (req, res) => {
    try {
      await pool.query('DELETE FROM branch_payments WHERE id = $1', [req.params.id]);
      res.json({ message: 'Deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
