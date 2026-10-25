const BOOK_TYPES = [
  { key: 'bilty_book', label: 'Bilty Book' },
  { key: 'bill_book', label: 'Bill Book' },
  { key: 'mr_book', label: 'Money Receipt Book' },
  { key: 'challan_book', label: 'Gadi Challan Book' }
]

const BOOK_TYPE_KEYS = new Set(BOOK_TYPES.map((book) => book.key))
const URGENCIES = new Set(['low', 'medium', 'high'])

function normalizeBookType(value) {
  const normalized = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  const aliases = {
    bilty: 'bilty_book',
    billing: 'bill_book',
    bill: 'bill_book',
    mr: 'mr_book',
    money_receipt: 'mr_book',
    money_receipt_book: 'mr_book',
    challan: 'challan_book',
    gadi_challan: 'challan_book',
    gadi_challan_book: 'challan_book'
  }
  const type = aliases[normalized] || normalized
  return BOOK_TYPE_KEYS.has(type) ? type : null
}

function positiveQuantity(value) {
  const quantity = Number(value)
  return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : null
}

function isAdmin(req, res) {
  if (req.user?.role === 'admin') return true
  res.status(403).json({ error: 'Only admin can manage company stationery stock.' })
  return false
}

async function findBranch(client, value) {
  if (value === undefined || value === null || String(value).trim() === '') return null
  const branchValue = String(value).trim()
  const parsedId = Number(branchValue)
  const numericId = Number.isSafeInteger(parsedId) && parsedId <= 2147483647 ? parsedId : null
  const result = await client.query(
    `SELECT id, branch_name, branch_code, url_slug
     FROM branches
     WHERE ($2::INTEGER IS NOT NULL AND id = $2::INTEGER)
       OR LOWER(url_slug) = LOWER($1)
       OR LOWER(branch_code) = LOWER($1)
     LIMIT 1`,
    [branchValue, numericId]
  )
  return result.rows[0] || null
}

async function distributeStock(client, branchId, bookType, quantity, username, reference) {
  const batchesResult = await client.query(
    `SELECT id, available_quantity
     FROM stationery_stock_batches
     WHERE book_type = $1 AND available_quantity > 0
     ORDER BY id
     FOR UPDATE`,
    [bookType]
  )
  const available = batchesResult.rows.reduce((sum, batch) => sum + batch.available_quantity, 0)
  if (available < quantity) {
    const error = new Error(`Only ${available} ${available === 1 ? 'book is' : 'books are'} available in main stock.`)
    error.status = 409
    throw error
  }

  let remainingToAssign = quantity
  for (const batch of batchesResult.rows) {
    if (!remainingToAssign) break
    const amount = Math.min(batch.available_quantity, remainingToAssign)
    await client.query(
      'UPDATE stationery_stock_batches SET available_quantity = available_quantity - $1 WHERE id = $2',
      [amount, batch.id]
    )
    remainingToAssign -= amount
  }

  const assigned = await client.query(
    `INSERT INTO stationery_stocks (branch_id, book_type, total_assigned, used, remaining)
     VALUES ($1, $2, $3, 0, $3)
     ON CONFLICT (branch_id, book_type) DO UPDATE
       SET total_assigned = stationery_stocks.total_assigned + EXCLUDED.total_assigned,
           remaining = stationery_stocks.remaining + EXCLUDED.remaining,
           updated_at = NOW()
     RETURNING total_assigned, used, remaining`,
    [branchId, bookType, quantity]
  )
  await client.query(
    `INSERT INTO stationery_stock_history
       (branch_id, book_type, action, quantity, remaining, reference, performed_by)
     VALUES ($1, $2, 'assigned', $3, $4, $5, $6)`,
    [branchId, bookType, quantity, assigned.rows[0].remaining, reference || null, username || 'Admin']
  )
  return assigned.rows[0]
}

function registerStationeryRoutes(app, { pool, authMiddleware }) {
  app.get('/api/stationery-stock', authMiddleware, async (req, res) => {
    try {
      if (!pool) return res.status(503).json({ error: 'Stationery stock is unavailable while the database is offline.' })
      if (req.user?.role === 'branch' || req.user?.role === 'branch_user') {
        const stocksResult = await pool.query(
          `SELECT books.book_type,
                  COALESCE(stocks.total_assigned, 0)::INTEGER AS total_assigned,
                  COALESCE(stocks.used, 0)::INTEGER AS used,
                  COALESCE(stocks.remaining, 0)::INTEGER AS remaining
           FROM unnest(ARRAY['bilty_book','bill_book','mr_book','challan_book']::TEXT[]) AS books(book_type)
           LEFT JOIN stationery_stocks AS stocks
             ON stocks.book_type = books.book_type AND stocks.branch_id = $1
           ORDER BY array_position(ARRAY['bilty_book','bill_book','mr_book','challan_book']::TEXT[], books.book_type)`,
          [req.user.branch_id]
        )
        const historyResult = await pool.query(
          `SELECT book_type, action, quantity, remaining, reference, performed_by, notes, created_at
           FROM stationery_stock_history
           WHERE branch_id = $1
           ORDER BY created_at DESC, id DESC
           LIMIT 200`,
          [req.user.branch_id]
        )
        const historyByType = new Map(BOOK_TYPES.map((book) => [book.key, []]))
        for (const item of historyResult.rows) historyByType.get(item.book_type)?.push(item)
        return res.json({
          data: stocksResult.rows.map((item) => ({
            ...item,
            label: BOOK_TYPES.find((book) => book.key === item.book_type)?.label,
            history: historyByType.get(item.book_type) || []
          }))
        })
      }

      if (!isAdmin(req, res)) return
      if (req.query.scope === 'all') {
        const [masterResult, branchesResult] = await Promise.all([
          pool.query(
            `SELECT books.book_type,
                    COALESCE(SUM(batches.quantity), 0)::INTEGER AS total_stock,
                    COALESCE(SUM(batches.available_quantity), 0)::INTEGER AS available
             FROM unnest(ARRAY['bilty_book','bill_book','mr_book','challan_book']::TEXT[]) AS books(book_type)
             LEFT JOIN stationery_stock_batches AS batches ON batches.book_type = books.book_type
             GROUP BY books.book_type
             ORDER BY array_position(ARRAY['bilty_book','bill_book','mr_book','challan_book']::TEXT[], books.book_type)`
          ),
          pool.query(
            `SELECT branches.id AS branch_id, branches.branch_name, branches.branch_code, branches.url_slug,
                    books.book_type,
                    COALESCE(stocks.total_assigned, 0)::INTEGER AS total_assigned,
                    COALESCE(stocks.used, 0)::INTEGER AS used,
                    COALESCE(stocks.remaining, 0)::INTEGER AS remaining
             FROM branches
             CROSS JOIN unnest(ARRAY['bilty_book','bill_book','mr_book','challan_book']::TEXT[]) AS books(book_type)
             LEFT JOIN stationery_stocks AS stocks
               ON stocks.branch_id = branches.id AND stocks.book_type = books.book_type
             WHERE COALESCE(branches.is_active, TRUE) = TRUE
             ORDER BY branches.branch_name,
               array_position(ARRAY['bilty_book','bill_book','mr_book','challan_book']::TEXT[], books.book_type)`
          )
        ])
        return res.json({ data: { masterStock: masterResult.rows, branchStock: branchesResult.rows } })
      }

      const branch = await findBranch(pool, req.query.branch_id || req.query.branch)
      if (!branch) return res.status(400).json({ error: 'Provide a valid branch to view its stationery stock.' })
      const result = await pool.query(
        `SELECT books.book_type,
                COALESCE(stocks.total_assigned, 0)::INTEGER AS total_assigned,
                COALESCE(stocks.used, 0)::INTEGER AS used,
                COALESCE(stocks.remaining, 0)::INTEGER AS remaining
         FROM unnest(ARRAY['bilty_book','bill_book','mr_book','challan_book']::TEXT[]) AS books(book_type)
         LEFT JOIN stationery_stocks AS stocks
           ON stocks.branch_id = $1 AND stocks.book_type = books.book_type
         ORDER BY array_position(ARRAY['bilty_book','bill_book','mr_book','challan_book']::TEXT[], books.book_type)`,
        [branch.id]
      )
      const historyResult = await pool.query(
        `SELECT book_type, action, quantity, remaining, reference, performed_by, notes, created_at
         FROM stationery_stock_history
         WHERE branch_id = $1
         ORDER BY created_at DESC, id DESC
         LIMIT 200`,
        [branch.id]
      )
      const historyByType = new Map(BOOK_TYPES.map((book) => [book.key, []]))
      for (const item of historyResult.rows) historyByType.get(item.book_type)?.push(item)
      return res.json({
        data: result.rows.map((item) => ({
          ...item,
          label: BOOK_TYPES.find((book) => book.key === item.book_type)?.label,
          history: historyByType.get(item.book_type) || []
        }))
      })
    } catch (error) {
      console.error('Stationery stock lookup failed:', error.message)
      return res.status(500).json({ error: 'Unable to load stationery stock.' })
    }
  })

  app.post('/api/stationery-stock/add', authMiddleware, async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Stationery stock cannot be changed while the database is offline.' })
    if (!isAdmin(req, res)) return
    const bookType = normalizeBookType(req.body?.type)
    const quantity = positiveQuantity(req.body?.qty)
    const startNo = String(req.body?.startNo || '').trim()
    const endNo = String(req.body?.endNo || '').trim()
    const cost = req.body?.cost === '' || req.body?.cost == null ? null : Number(req.body.cost)
    const stockDate = req.body?.date || null
    if (!bookType || !quantity || !startNo || !endNo) {
      return res.status(400).json({ error: 'A valid book type, quantity, starting number, and ending number are required.' })
    }
    const startMatch = startNo.match(/^(.*?)(\d+)$/)
    const endMatch = endNo.match(/^(.*?)(\d+)$/)
    if (!startMatch || !endMatch || startMatch[1] !== endMatch[1] ||
        Number(endMatch[2]) - Number(startMatch[2]) + 1 !== quantity) {
      return res.status(400).json({ error: 'The ending number must match the book quantity and starting number series.' })
    }
    if (cost !== null && (!Number.isFinite(cost) || cost < 0)) {
      return res.status(400).json({ error: 'Cost must be a non-negative number.' })
    }
    const parsedStockDate = stockDate ? new Date(`${stockDate}T00:00:00.000Z`) : null
    if (stockDate && (
      !/^\d{4}-\d{2}-\d{2}$/.test(stockDate) ||
      Number.isNaN(parsedStockDate.getTime()) ||
      parsedStockDate.toISOString().slice(0, 10) !== stockDate
    )) {
      return res.status(400).json({ error: 'Date must use YYYY-MM-DD format.' })
    }
    try {
      const result = await pool.query(
        `INSERT INTO stationery_stock_batches
           (book_type, quantity, available_quantity, start_no, end_no, supplier_name, cost, stock_date, created_by)
         VALUES ($1, $2, $2, $3, $4, $5, $6, COALESCE($7::DATE, CURRENT_DATE), $8)
         RETURNING *`,
        [bookType, quantity, startNo, endNo, String(req.body?.supplier || '').trim() || null, cost, stockDate, req.user.username]
      )
      return res.status(201).json({ data: result.rows[0] })
    } catch (error) {
      console.error('Stationery stock add failed:', error.message)
      return res.status(500).json({ error: 'Unable to add stationery to main stock.' })
    }
  })

  app.post('/api/stationery-stock/distribute', authMiddleware, async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Stationery stock cannot be changed while the database is offline.' })
    if (!isAdmin(req, res)) return
    const bookType = normalizeBookType(req.body?.type)
    const quantity = positiveQuantity(req.body?.qty)
    if (!bookType || !quantity || !req.body?.branchId) {
      return res.status(400).json({ error: 'A valid branch, book type, and positive quantity are required.' })
    }
    let client
    try {
      client = await pool.connect()
      await client.query('BEGIN')
      const branch = await findBranch(client, req.body.branchId)
      if (!branch) {
        await client.query('ROLLBACK')
        return res.status(404).json({ error: 'Branch not found.' })
      }
      const stock = await distributeStock(client, branch.id, bookType, quantity, req.user.username, 'Branch distribution')
      await client.query('COMMIT')
      return res.json({ data: { branch, book_type: bookType, ...stock } })
    } catch (error) {
      if (client) {
        try { await client.query('ROLLBACK') } catch (rollbackError) { console.error('Stationery distribution rollback failed:', rollbackError.message) }
      }
      console.error('Stationery distribution failed:', error.message)
      return res.status(error.status || 500).json({ error: error.status ? error.message : 'Unable to distribute stationery stock.' })
    } finally {
      client?.release()
    }
  })

  app.post('/api/stationery-stock/request', authMiddleware, async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Stationery requests cannot be saved while the database is offline.' })
    const branchUser = ['branch', 'branch_user'].includes(req.user?.role)
    const bookType = normalizeBookType(req.body?.type)
    const quantity = positiveQuantity(req.body?.qty)
    const reason = String(req.body?.reason || '').trim()
    const urgency = String(req.body?.urgency || 'medium').toLowerCase()
    if (!bookType || !quantity || !reason || !URGENCIES.has(urgency)) {
      return res.status(400).json({ error: 'A valid book type, quantity, reason, and urgency are required.' })
    }
    let client
    try {
      client = await pool.connect()
      await client.query('BEGIN')
      const branch = branchUser ? { id: req.user.branch_id } : await findBranch(client, req.body?.branch)
      if (!branch) {
        await client.query('ROLLBACK')
        return res.status(400).json({ error: 'A valid branch is required for this request.' })
      }
      const result = await client.query(
        `INSERT INTO stationery_requests
           (branch_id, book_type, qty, reason, urgency, requested_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [branch.id, bookType, quantity, reason, urgency, req.user.username]
      )
      await client.query(
        `INSERT INTO stationery_stock_history
           (branch_id, book_type, action, quantity, performed_by, notes)
         VALUES ($1, $2, 'requested', $3, $4, $5)`,
        [branch.id, bookType, quantity, req.user.username, reason]
      )
      await client.query('COMMIT')
      return res.status(201).json({ data: result.rows[0] })
    } catch (error) {
      if (client) {
        try { await client.query('ROLLBACK') } catch (rollbackError) { console.error('Stationery request rollback failed:', rollbackError.message) }
      }
      console.error('Stationery request creation failed:', error.message)
      return res.status(500).json({ error: 'Unable to save the stationery request.' })
    } finally {
      client?.release()
    }
  })

  app.get('/api/stationery-stock/requests', authMiddleware, async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Stationery requests are unavailable while the database is offline.' })
    if (!isAdmin(req, res)) return
    try {
      const result = await pool.query(
        `SELECT requests.id, requests.book_type, requests.qty, requests.reason, requests.urgency,
                requests.status, requests.date, requests.requested_by, requests.reviewed_by,
                branches.id AS branch_id, branches.branch_name, branches.url_slug
         FROM stationery_requests AS requests
         JOIN branches ON branches.id = requests.branch_id
         ORDER BY CASE requests.status WHEN 'pending' THEN 0 ELSE 1 END, requests.date DESC`
      )
      return res.json({ data: result.rows })
    } catch (error) {
      console.error('Stationery request lookup failed:', error.message)
      return res.status(500).json({ error: 'Unable to load stationery requests.' })
    }
  })

  app.patch('/api/stationery-stock/requests/:id', authMiddleware, async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Stationery requests cannot be updated while the database is offline.' })
    if (!isAdmin(req, res)) return
    const action = String(req.body?.action || '').toLowerCase()
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Choose approve or reject.' })
    }
    let client
    try {
      client = await pool.connect()
      await client.query('BEGIN')
      const requestResult = await client.query(
        'SELECT * FROM stationery_requests WHERE id = $1 FOR UPDATE',
        [req.params.id]
      )
      const request = requestResult.rows[0]
      if (!request) {
        await client.query('ROLLBACK')
        return res.status(404).json({ error: 'Stationery request not found.' })
      }
      if (request.status !== 'pending') {
        await client.query('ROLLBACK')
        return res.status(409).json({ error: 'This stationery request has already been reviewed.' })
      }
      if (action === 'approve') {
        await distributeStock(client, request.branch_id, request.book_type, request.qty, req.user.username, `Request #${request.id}`)
      }
      const result = await client.query(
        `UPDATE stationery_requests
         SET status = $1, reviewed_by = $2, reviewed_at = NOW()
         WHERE id = $3 RETURNING *`,
        [action === 'approve' ? 'approved' : 'rejected', req.user.username, request.id]
      )
      await client.query('COMMIT')
      return res.json({ data: result.rows[0] })
    } catch (error) {
      if (client) {
        try { await client.query('ROLLBACK') } catch (rollbackError) { console.error('Stationery request rollback failed:', rollbackError.message) }
      }
      console.error('Stationery request review failed:', error.message)
      return res.status(error.status || 500).json({ error: error.status ? error.message : 'Unable to review the stationery request.' })
    } finally {
      client?.release()
    }
  })
}

module.exports = registerStationeryRoutes
