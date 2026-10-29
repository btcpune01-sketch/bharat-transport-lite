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
            SELECT b.*, br.branch_name 
            FROM bilty b
            LEFT JOIN branches br ON b.branch_id = br.id
        `;
        let countQuery = `SELECT COUNT(*) FROM bilty`;
        let params = [];

        // ब्रांच यूजर हो तो सिर्फ उसकी ब्रांच की बिल्टी दिखाएं
        if (req.user && (req.user.role === 'branch' || req.user.role === 'branch_user')) {
            query += ` WHERE b.branch_id = $1`;
            countQuery += ` WHERE branch_id = $1`;
            params = [req.user.branch_id];
        }

        query += ` ORDER BY b.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
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
