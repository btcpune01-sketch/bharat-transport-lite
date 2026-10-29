// backend/routes/billList.js
const express = require('express');
const router = express.Router();

// GET /api/bill-list?page=1&limit=10
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Note: Table name is 'bill_book', not 'bills'
        let query = `
            SELECT bb.bill_no, bb.bill_date, bb.party_name, bb.grand_total, bb.status, bb.payment_status, bb.branch_code, b.branch_name 
            FROM bill_book bb
            LEFT JOIN branches b ON bb.branch_id = b.id
        `;
        let countQuery = `SELECT COUNT(*) FROM bill_book`;
        let params = [];

        // ब्रांच यूजर हो तो सिर्फ उसकी ब्रांच के बिल दिखाएं
        if (req.user && (req.user.role === 'branch' || req.user.role === 'branch_user')) {
            query += ` WHERE bb.branch_id = $1`;
            countQuery += ` WHERE branch_id = $1`;
            params = [req.user.branch_id];
        }

        query += ` ORDER BY bb.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
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
