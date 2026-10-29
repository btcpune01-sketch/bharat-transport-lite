// backend/routes/billList.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db'); 
const authMiddleware = require('../middleware/auth'); 

// GET /api/bill-list?page=1&limit=10
router.get('/', authMiddleware, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const isAdmin = req.user && String(req.user.role || '').toLowerCase() === 'admin';
        const branchId = req.user ? req.user.branch_id : null;

        let query = `
            SELECT bb.id, bb.bill_no, bb.bill_date, bb.party_name, bb.grand_total, bb.status, bb.payment_status, bb.branch_code, b.branch_name 
            FROM bill_book bb
            LEFT JOIN branches b ON bb.branch_id = b.id
        `;
        let countQuery = `SELECT COUNT(*) FROM bill_book`;
        let params = [];

        if (!isAdmin && branchId) {
            query += ` WHERE bb.branch_id = $1`;
            countQuery += ` WHERE branch_id = $1`;
            params = [branchId];
        }

        query += ` ORDER BY bb.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        const countResult = await pool.query(countQuery, params.slice(0, 1));

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
                totalRecords: parseInt(countResult.rows[0].count),
                limit: limit
            }
        });
    } catch (err) {
        console.error('Error in /api/bill-list:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
