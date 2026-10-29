// backend/routes/biltyList.js
const express = require('express');
const router = express.Router();

// GET /api/bilty-list?page=1&limit=10
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        let query = `
            SELECT c.lr_no, c.lr_date, c.consignor_name, c.consignee_name, c.grand_total, c.status, c.payment_status, c.branch_code, b.branch_name 
            FROM consignments c
            LEFT JOIN branches b ON c.branch_id = b.id
        `;
        let countQuery = `SELECT COUNT(*) FROM consignments`;
        let params = [];

        if (req.user && (req.user.role === 'branch' || req.user.role === 'branch_user')) {
            query += ` WHERE c.branch_id = $1`;
            countQuery += ` WHERE branch_id = $1`;
            params = [req.user.branch_id];
        }

        query += ` ORDER BY c.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await req.app.locals.pool.query(query, params);
        const countResult = await req.app.locals.pool.query(countQuery, params.slice(0, 1));

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
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
