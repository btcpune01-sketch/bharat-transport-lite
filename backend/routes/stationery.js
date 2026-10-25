const BOOK_TYPES = [
  { key: 'bilty_book', label: 'Bilty Book', unit: 'Books' },
  { key: 'bill_book', label: 'Bill Book', unit: 'Books' },
  { key: 'mr_book', label: 'Money Receipt Book', unit: 'Books' },
  { key: 'challan_book', label: 'Gadi Challan Book', unit: 'Books' },
  { key: 'a4_paper_reams', label: 'A4 Paper Reams', unit: 'Reams' },
  { key: 'printer_ink_black', label: 'Printer Ink (Black)', unit: 'Cartridges' },
  { key: 'dot_matrix_ribbon', label: 'Dot Matrix Ribbon', unit: 'Ribbons' },
  { key: 'envelopes_large', label: 'Envelopes (Large)', unit: 'Pieces' },
  { key: 'stapler_pins', label: 'Stapler Pins', unit: 'Boxes' },
  { key: 'file_folders', label: 'File Folders', unit: 'Pieces' },
  { key: 'carbon_paper', label: 'Carbon Paper', unit: 'Pieces' },
  { key: 'stamp_pad', label: 'Stamp Pad', unit: 'Pieces' },
  { key: 'pen_marker', label: 'Pen / Marker', unit: 'Pieces' }
]

const BOOK_TYPE_KEYS = new Set(BOOK_TYPES.map((book) => book.key))
const DOCUMENT_BOOK_TYPES = BOOK_TYPES.slice(0, 4)
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
  return BOOK_TYPE_KEYS.has(type) || /^[a-z0-9_]{1,50}$/.test(type) ? type : null
}

function positiveQuantity(value) {
  const quantity = Number(value)
  return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : null
}

function incrementSerial(value) {
  const match = String(value || '').match(/^(.*?)(\d+)$/)
  if (!match) return value || null
  return `${match[1]}${(BigInt(match[2]) + 1n).toString().padStart(match[2].length, '0')}`
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
  const history = await client.query(
    `INSERT INTO stationery_stock_history
       (branch_id, book_type, action, quantity, remaining, reference, performed_by, source)
     VALUES ($1, $2, 'assigned', $3, $4, $5, $6, 'master')
     RETURNING id`,
    [branchId, bookType, quantity, assigned.rows[0].remaining, reference || null, username || 'Admin']
  )
  return { ...assigned.rows[0], historyId: history.rows[0]?.id }
}

async function recordMasterStockAddition(client, bookType, quantity, username) {
  let item = await client.query(
    `UPDATE stock_items
     SET total_quantity = COALESCE(total_quantity, 0) + $1,
         remaining_quantity = GREATEST(COALESCE(total_quantity, 0) + $1 - COALESCE(used_quantity, 0), 0)
     WHERE item_type = $2 AND branch_id IS NULL AND is_active = TRUE
     RETURNING id`,
    [quantity, bookType]
  )
  if (!item.rowCount) {
    const definition = BOOK_TYPES.find((book) => book.key === bookType)
    item = await client.query(
      `INSERT INTO stock_items
         (item_code, item_name, item_type, name, type, unit, total_quantity, used_quantity, remaining_quantity, low_stock_limit)
       VALUES ($1, $2, $3, $2, $3, $4, $5, 0, $5, 10)
       ON CONFLICT (item_code) DO UPDATE
         SET total_quantity = stock_items.total_quantity + EXCLUDED.total_quantity,
             remaining_quantity = stock_items.remaining_quantity + EXCLUDED.remaining_quantity
       RETURNING id`,
      [`ST-MASTER-${bookType.toUpperCase()}`, definition?.label || bookType, bookType, definition?.unit || 'Units', quantity]
    )
  }
  await client.query(
    `INSERT INTO stock_history (stock_item_id, action, used_by, date)
     VALUES ($1, 'added', $2, CURRENT_DATE)`,
    [item.rows[0].id, username || 'Admin']
  )
}

function registerStationeryRoutes(app, { pool, authMiddleware }) {
  app.get('/api/stationery-stock/branch-overview', authMiddleware, async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Branch stationery stock is unavailable while the database is offline.' })
    if (!isAdmin(req, res)) return
    try {
      const [branchesResult, masterResult, historyResult] = await Promise.all([
        pool.query(
          `SELECT id AS branch_id, branch_name, branch_code, url_slug
           FROM branches WHERE COALESCE(is_active, TRUE) = TRUE ORDER BY branch_name`
        ),
        pool.query(
          `SELECT books.book_type,
                  COALESCE(SUM(batches.quantity), 0)::INTEGER AS total_stock,
                  COALESCE(SUM(batches.available_quantity), 0)::INTEGER AS available
           FROM unnest($1::TEXT[]) AS books(book_type)
           LEFT JOIN stationery_stock_batches AS batches ON batches.book_type = books.book_type
           GROUP BY books.book_type`,
          [BOOK_TYPES.map((book) => book.key)]
        ),
        pool.query(
          `SELECT history.id, history.branch_id, branches.branch_name, branches.url_slug,
                  history.book_type, history.action, history.quantity, history.remaining,
                  history.reference, history.performed_by, history.notes, history.source,
                  history.master_remaining, history.start_serial, history.end_serial,
                  history.current_running_serial, history.bilty_no, history.created_at
           FROM stationery_stock_history AS history
           JOIN branches ON branches.id = history.branch_id
           ORDER BY history.created_at DESC, history.id DESC
           LIMIT 1000`
        )
      ])
      const branchStockResult = await pool.query(
        `SELECT branch_id, book_type, total_assigned, used, remaining,
                start_serial, end_serial, current_running_serial, supplier, cost, created_at, updated_at
         FROM stationery_stocks ORDER BY branch_id, book_type`
      )
      const masterByType = new Map(masterResult.rows.map((item) => [item.book_type, item]))
      const branchStocks = new Map()
      for (const row of branchStockResult.rows) {
        const key = String(row.branch_id)
        if (!branchStocks.has(key)) branchStocks.set(key, [])
        branchStocks.get(key).push({
          ...row,
          label: BOOK_TYPES.find((book) => book.key === row.book_type)?.label || row.book_type,
          unit: BOOK_TYPES.find((book) => book.key === row.book_type)?.unit || 'Units',
          master_available: Number(masterByType.get(row.book_type)?.available) || 0
        })
      }
      const branches = branchesResult.rows.map((branch) => ({
        ...branch,
        stocks: BOOK_TYPES.map((book) => {
          const item = branchStocks.get(String(branch.branch_id))?.find((row) => row.book_type === book.key)
          return item || {
            book_type: book.key,
            label: book.label,
            unit: book.unit,
            total_assigned: 0,
            used: 0,
            remaining: 0,
            master_available: Number(masterByType.get(book.key)?.available) || 0
          }
        })
      }))
      const masterStock = BOOK_TYPES.map((book) => ({
        book_type: book.key,
        label: book.label,
        unit: book.unit,
        total_stock: Number(masterByType.get(book.key)?.total_stock) || 0,
        available: Number(masterByType.get(book.key)?.available) || 0,
        used: Math.max(
          0,
          (Number(masterByType.get(book.key)?.total_stock) || 0) -
          (Number(masterByType.get(book.key)?.available) || 0) -
          branches.reduce((sum, branch) => {
            const branchBook = branch.stocks.find((item) => item.book_type === book.key)
            return sum + (Number(branchBook?.remaining) || 0)
          }, 0)
        )
      }))
      return res.json({ data: { branches, masterStock, history: historyResult.rows } })
    } catch (error) {
      console.error('Branch stationery overview failed:', error.message)
      return res.status(500).json({ error: 'Unable to load branch stationery stock.' })
    }
  })

  app.get('/api/stationery-stock/branch', authMiddleware, async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Branch stationery stock is unavailable while the database is offline.' })
    try {
      const isBranchUser = ['branch', 'branch_user'].includes(req.user?.role)
      const branch = isBranchUser
        ? { id: req.user.branch_id, branch_name: req.user.branch_name, url_slug: req.user.branch_slug }
        : await findBranch(pool, req.query.branch)
      if (!branch) return res.status(400).json({ error: 'Provide a valid branch to view its stationery stock.' })
      if (!isBranchUser && !isAdmin(req, res)) return
      const result = await pool.query(
        `SELECT books.book_type,
                COALESCE(stocks.total_assigned, 0)::INTEGER AS total_assigned,
                COALESCE(stocks.used, 0)::INTEGER AS used,
                COALESCE(stocks.remaining, 0)::INTEGER AS remaining,
                stocks.start_serial, stocks.end_serial, stocks.current_running_serial,
                stocks.supplier, stocks.cost, stocks.created_at, stocks.updated_at
         FROM unnest($2::TEXT[]) AS books(book_type)
         LEFT JOIN stationery_stocks AS stocks
           ON stocks.branch_id = $1 AND stocks.book_type = books.book_type
         ORDER BY array_position($2::TEXT[], books.book_type)`,
        [branch.id, BOOK_TYPES.map((book) => book.key)]
      )
      return res.json({
        data: {
          branch,
          stock: result.rows.map((item) => ({
            ...item,
            label: BOOK_TYPES.find((book) => book.key === item.book_type)?.label || item.book_type,
            unit: BOOK_TYPES.find((book) => book.key === item.book_type)?.unit || 'Units'
          }))
        }
      })
    } catch (error) {
      console.error('Branch stationery lookup failed:', error.message)
      return res.status(500).json({ error: 'Unable to load branch stationery stock.' })
    }
  })

  app.get('/api/stationery-stock/branch-history', authMiddleware, async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Branch stationery history is unavailable while the database is offline.' })
    try {
      const isBranchUser = ['branch', 'branch_user'].includes(req.user?.role)
      const branch = isBranchUser
        ? { id: req.user.branch_id }
        : req.query.branch ? await findBranch(pool, req.query.branch) : null
      if (!isBranchUser && !isAdmin(req, res)) return
      if (!isBranchUser && req.query.branch && !branch) return res.status(400).json({ error: 'Branch not found.' })
      const values = []
      const where = []
      if (branch) {
        values.push(branch.id)
        where.push(`history.branch_id = $${values.length}`)
      }
      const bookType = req.query.bookType && normalizeBookType(req.query.bookType)
      if (req.query.bookType && !bookType) return res.status(400).json({ error: 'Invalid book type.' })
      if (bookType) {
        values.push(bookType)
        where.push(`history.book_type = $${values.length}`)
      }
      if (req.query.from) {
        values.push(req.query.from)
        where.push(`history.created_at::DATE >= $${values.length}::DATE`)
      }
      if (req.query.to) {
        values.push(req.query.to)
        where.push(`history.created_at::DATE <= $${values.length}::DATE`)
      }
      const result = await pool.query(
        `SELECT history.id, history.branch_id, branches.branch_name, branches.url_slug,
                history.book_type, history.action, history.quantity, history.remaining,
                history.reference, history.performed_by, history.notes, history.source,
                history.master_remaining, history.start_serial, history.end_serial,
                history.current_running_serial, history.bilty_no, history.created_at
         FROM stationery_stock_history AS history
         JOIN branches ON branches.id = history.branch_id
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY history.created_at DESC, history.id DESC LIMIT 1000`,
        values
      )
      return res.json({ data: result.rows })
    } catch (error) {
      console.error('Branch stationery history failed:', error.message)
      return res.status(500).json({ error: 'Unable to load branch stationery history.' })
    }
  })

  app.get('/api/stationery-stock', authMiddleware, async (req, res) => {
    try {
      if (!pool) return res.status(503).json({ error: 'Stationery stock is unavailable while the database is offline.' })
      if (req.user?.role === 'branch' || req.user?.role === 'branch_user') {
        const stocksResult = await pool.query(
          `SELECT books.book_type,
                  COALESCE(stocks.total_assigned, 0)::INTEGER AS total_assigned,
                  COALESCE(stocks.used, 0)::INTEGER AS used,
                  COALESCE(stocks.remaining, 0)::INTEGER AS remaining,
                  stocks.start_serial, stocks.end_serial, stocks.current_running_serial,
                  stocks.supplier, stocks.cost, stocks.created_at, stocks.updated_at
           FROM unnest($2::TEXT[]) AS books(book_type)
           LEFT JOIN stationery_stocks AS stocks
             ON stocks.book_type = books.book_type AND stocks.branch_id = $1
           ORDER BY array_position($2::TEXT[], books.book_type)`,
          [req.user.branch_id, BOOK_TYPES.map((book) => book.key)]
        )
        const historyResult = await pool.query(
          `SELECT book_type, action, quantity, remaining, reference, performed_by, notes,
                  start_serial, end_serial, current_running_serial, bilty_no, created_at
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
                    COALESCE(stocks.remaining, 0)::INTEGER AS remaining,
                    stocks.start_serial, stocks.end_serial, stocks.current_running_serial,
                    stocks.supplier, stocks.cost, stocks.created_at, stocks.updated_at
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
                COALESCE(stocks.remaining, 0)::INTEGER AS remaining,
                stocks.start_serial, stocks.end_serial, stocks.current_running_serial,
                stocks.supplier, stocks.cost, stocks.created_at, stocks.updated_at
         FROM unnest($2::TEXT[]) AS books(book_type)
         LEFT JOIN stationery_stocks AS stocks
           ON stocks.branch_id = $1 AND stocks.book_type = books.book_type
         ORDER BY array_position($2::TEXT[], books.book_type)`,
        [branch.id, BOOK_TYPES.map((book) => book.key)]
      )
      const historyResult = await pool.query(
        `SELECT book_type, action, quantity, remaining, reference, performed_by, notes,
                start_serial, end_serial, current_running_serial, bilty_no, created_at
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

  app.post('/api/stationery-stock/branch-self-update', authMiddleware, async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Branch stationery stock cannot be changed while the database is offline.' })
    const isBranchUser = ['branch', 'branch_user'].includes(req.user?.role)
    if (!isBranchUser && !isAdmin(req, res)) return

    const branchSlug = String(req.body?.branchSlug || '').trim()
    const bookType = normalizeBookType(req.body?.bookType)
    const action = String(req.body?.action || 'add').toLowerCase()
    const rawQuantity = Number(req.body?.quantity)
    const quantity = action === 'correction'
      ? (Number.isSafeInteger(rawQuantity) && rawQuantity !== 0 ? rawQuantity : null)
      : positiveQuantity(rawQuantity)
    const startSerial = String(req.body?.startSerial || '').trim()
    const endSerial = String(req.body?.endSerial || '').trim()
    const currentRunningSerial = String(req.body?.currentRunningSerial || '').trim()
    const supplier = String(req.body?.supplier || '').trim()
    const remark = String(req.body?.remark || '').trim()
    const cost = req.body?.cost === '' || req.body?.cost == null ? null : Number(req.body.cost)
    const stockDate = String(req.body?.date || '').trim()
    const parsedStockDate = stockDate ? new Date(`${stockDate}T00:00:00.000Z`) : null

    if (!branchSlug || !bookType || !quantity || !['add', 'update', 'correction'].includes(action)) {
      return res.status(400).json({ error: 'A valid branch, book type, action, and quantity are required.' })
    }
    if (!BOOK_TYPE_KEYS.has(bookType)) {
      return res.status(400).json({ error: 'Choose a supported stationery book type.' })
    }
    if (isBranchUser && branchSlug.toLowerCase() !== String(req.user.branch_slug || '').toLowerCase()) {
      return res.status(403).json({ error: 'You can only update stationery stock for your own branch.' })
    }
    if (cost !== null && (!Number.isFinite(cost) || cost < 0)) {
      return res.status(400).json({ error: 'Cost must be a non-negative number.' })
    }
    if ((startSerial && !endSerial) || (!startSerial && endSerial)) {
      return res.status(400).json({ error: 'Provide both starting and ending serial numbers.' })
    }
    if (startSerial && action !== 'correction') {
      const startMatch = startSerial.match(/^(.*?)(\d+)$/)
      const endMatch = endSerial.match(/^(.*?)(\d+)$/)
      if (!startMatch || !endMatch || startMatch[1] !== endMatch[1] ||
          BigInt(endMatch[2]) - BigInt(startMatch[2]) + 1n !== BigInt(quantity)) {
        return res.status(400).json({ error: 'Ending serial must match the quantity and starting serial range.' })
      }
    }
    if (stockDate && (
      !/^\d{4}-\d{2}-\d{2}$/.test(stockDate) ||
      Number.isNaN(parsedStockDate.getTime()) ||
      parsedStockDate.toISOString().slice(0, 10) !== stockDate
    )) {
      return res.status(400).json({ error: 'Date must use YYYY-MM-DD format.' })
    }

    let client
    try {
      client = await pool.connect()
      await client.query('BEGIN')
      const branch = await findBranch(client, isBranchUser ? req.user.branch_id : branchSlug)
      if (!branch || branch.url_slug.toLowerCase() !== branchSlug.toLowerCase()) {
        await client.query('ROLLBACK')
        return res.status(404).json({ error: 'Branch not found.' })
      }
      await client.query('SELECT pg_advisory_xact_lock($1, hashtext($2))', [branch.id, bookType])
      const existingResult = await client.query(
        `SELECT * FROM stationery_stocks
         WHERE branch_id = $1 AND book_type = $2
         FOR UPDATE`,
        [branch.id, bookType]
      )
      const existing = existingResult.rows[0]
      let totalAssigned
      let remaining
      if (action === 'update') {
        const used = Number(existing?.used) || 0
        if (quantity < used) {
          await client.query('ROLLBACK')
          return res.status(400).json({ error: `Total stock cannot be less than the ${used} units already used.` })
        }
        totalAssigned = quantity
        remaining = quantity - used
      } else {
        totalAssigned = (Number(existing?.total_assigned) || 0) + quantity
        remaining = (Number(existing?.remaining) || 0) + quantity
        if (remaining < 0) {
          await client.query('ROLLBACK')
          return res.status(400).json({ error: 'Correction cannot reduce remaining stock below zero.' })
        }
      }
      if (totalAssigned < (Number(existing?.used) || 0)) {
        await client.query('ROLLBACK')
        return res.status(400).json({ error: 'Correction cannot reduce total stock below units already used.' })
      }

      const updated = await client.query(
        `INSERT INTO stationery_stocks
           (branch_id, book_type, total_assigned, used, remaining, start_serial, end_serial,
            current_running_serial, supplier, cost, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
         ON CONFLICT (branch_id, book_type) DO UPDATE
           SET total_assigned = EXCLUDED.total_assigned,
               remaining = EXCLUDED.remaining,
               start_serial = COALESCE(EXCLUDED.start_serial, stationery_stocks.start_serial),
               end_serial = COALESCE(EXCLUDED.end_serial, stationery_stocks.end_serial),
               current_running_serial = COALESCE(EXCLUDED.current_running_serial, stationery_stocks.current_running_serial),
               supplier = COALESCE(EXCLUDED.supplier, stationery_stocks.supplier),
               cost = COALESCE(EXCLUDED.cost, stationery_stocks.cost),
               updated_at = NOW()
         RETURNING *`,
        [
          branch.id, bookType, totalAssigned, Number(existing?.used) || 0, remaining,
          startSerial || null, endSerial || null,
          currentRunningSerial || startSerial || existing?.current_running_serial || null,
          supplier || null, cost
        ]
      )
      await client.query(
        `INSERT INTO stationery_stock_history
           (branch_id, book_type, action, quantity, remaining, performed_by, notes,
            start_serial, end_serial, current_running_serial, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11::DATE::TIMESTAMPTZ, NOW()))`,
        [
          branch.id, bookType, action === 'add' ? 'added' : action === 'update' ? 'updated' : 'correction',
          Math.abs(quantity), remaining, req.user.username, remark || null,
          startSerial || null, endSerial || null, currentRunningSerial || startSerial || null,
          stockDate || null
        ]
      )
      await client.query('COMMIT')
      return res.status(200).json({ data: { branch, stock: updated.rows[0] } })
    } catch (error) {
      if (client) {
        try { await client.query('ROLLBACK') } catch (rollbackError) { console.error('Branch self-update rollback failed:', rollbackError.message) }
      }
      console.error('Branch stationery self-update failed:', error.message)
      return res.status(500).json({ error: 'Unable to update branch stationery stock.' })
    } finally {
      client?.release()
    }
  })

  app.post('/api/stationery-stock/add', authMiddleware, async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Stationery stock cannot be changed while the database is offline.' })
    if (!isAdmin(req, res)) return
    const bookType = normalizeBookType(req.body?.type)
    const quantity = positiveQuantity(req.body?.qty)
    const suppliedStartNo = String(req.body?.startNo || '').trim()
    const suppliedEndNo = String(req.body?.endNo || '').trim()
    const startNo = suppliedStartNo || `STOCK-${Date.now()}-0001`
    const endNo = suppliedEndNo || `STOCK-${Date.now()}-${String(quantity || 0).padStart(4, '0')}`
    const cost = req.body?.cost === '' || req.body?.cost == null ? null : Number(req.body.cost)
    const stockDate = req.body?.date || null
    if (!bookType || !quantity || ((suppliedStartNo || suppliedEndNo) && !(suppliedStartNo && suppliedEndNo))) {
      return res.status(400).json({ error: 'A valid book type and quantity are required; provide both book numbers when applicable.' })
    }
    const startMatch = suppliedStartNo && suppliedStartNo.match(/^(.*?)(\d+)$/)
    const endMatch = suppliedEndNo && suppliedEndNo.match(/^(.*?)(\d+)$/)
    if (suppliedStartNo && (!startMatch || !endMatch || startMatch[1] !== endMatch[1] ||
        Number(endMatch[2]) - Number(startMatch[2]) + 1 !== quantity)) {
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
    let client
    try {
      client = await pool.connect()
      await client.query('BEGIN')
      const result = await client.query(
        `INSERT INTO stationery_stock_batches
           (book_type, quantity, available_quantity, start_no, end_no, supplier_name, bill_no, source, cost, stock_date, created_by)
         VALUES ($1, $2, $2, $3, $4, $5, $6, 'direct', $7, COALESCE($8::DATE, CURRENT_DATE), $9)
         RETURNING *`,
        [
          bookType, quantity, startNo, endNo,
          String(req.body?.supplier || '').trim() || null,
          String(req.body?.billNo || '').trim() || null,
          cost, stockDate, req.user.username
        ]
      )
      await recordMasterStockAddition(client, bookType, quantity, req.user.username)
      await client.query('COMMIT')
      return res.status(201).json({ data: result.rows[0] })
    } catch (error) {
      if (client) {
        try { await client.query('ROLLBACK') } catch (rollbackError) { console.error('Master stationery addition rollback failed:', rollbackError.message) }
      }
      console.error('Stationery stock add failed:', error.message)
      return res.status(500).json({ error: 'Unable to add stationery to main stock.' })
    } finally {
      client?.release()
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

  app.post('/api/stationery-stock/branch-add', authMiddleware, async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Branch stationery stock cannot be changed while the database is offline.' })
    if (!isAdmin(req, res)) return
    const branchValue = req.body?.branchSlug || req.body?.branchId
    const bookType = normalizeBookType(req.body?.bookType)
    const quantity = positiveQuantity(req.body?.quantity)
    const source = String(req.body?.source || '').toLowerCase()
    const reason = String(req.body?.reason || '').trim()
    const supplier = String(req.body?.supplier || '').trim()
    const billNo = String(req.body?.billNo || '').trim()
    const cost = req.body?.cost === '' || req.body?.cost == null ? null : Number(req.body.cost)
    const stockDate = req.body?.date || null
    if (!branchValue || !bookType || !quantity || !['master', 'direct'].includes(source)) {
      return res.status(400).json({ error: 'A valid branch, book type, quantity, and stock source are required.' })
    }
    if (cost !== null && (!Number.isFinite(cost) || cost < 0)) {
      return res.status(400).json({ error: 'Cost must be a non-negative number.' })
    }
    if (source === 'direct' && !supplier) {
      return res.status(400).json({ error: 'Supplier or press name is required for a direct purchase.' })
    }
    const parsedDate = stockDate ? new Date(`${stockDate}T00:00:00.000Z`) : null
    if (stockDate && (
      !/^\d{4}-\d{2}-\d{2}$/.test(stockDate) ||
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== stockDate
    )) {
      return res.status(400).json({ error: 'Date must use YYYY-MM-DD format.' })
    }

    let client
    try {
      client = await pool.connect()
      await client.query('BEGIN')
      const branch = await findBranch(client, branchValue)
      if (!branch) {
        await client.query('ROLLBACK')
        return res.status(404).json({ error: 'Branch not found.' })
      }
      if (source === 'direct') {
        const startNo = `DIRECT-${Date.now()}-0001`
        await client.query(
          `INSERT INTO stationery_stock_batches
             (book_type, quantity, available_quantity, start_no, end_no, supplier_name, bill_no, source, cost, stock_date, created_by)
           VALUES ($1, $2, $2, $3, $3, $4, $5, 'direct', $6, COALESCE($7::DATE, CURRENT_DATE), $8)`,
          [bookType, quantity, startNo, supplier, billNo || null, cost, stockDate, req.user.username]
        )
        await recordMasterStockAddition(client, bookType, quantity, req.user.username)
      }
      const branchBalance = await distributeStock(
        client,
        branch.id,
        bookType,
        quantity,
        req.user.username,
        reason || (source === 'master' ? 'Master stock allocation' : `Direct purchase${billNo ? ` - ${billNo}` : ''}`)
      )
      const masterResult = await client.query(
        'SELECT COALESCE(SUM(available_quantity), 0)::INTEGER AS remaining FROM stationery_stock_batches WHERE book_type = $1',
        [bookType]
      )
      await client.query(
        `UPDATE stationery_stock_history
         SET source = $1, master_remaining = $2
         WHERE id = $3`,
        [source, masterResult.rows[0].remaining, branchBalance.historyId]
      )
      await client.query('COMMIT')
      return res.status(201).json({
        success: true,
        data: {
          branch,
          bookType,
          newRemaining: branchBalance.remaining,
          masterRemaining: masterResult.rows[0].remaining
        }
      })
    } catch (error) {
      if (client) {
        try { await client.query('ROLLBACK') } catch (rollbackError) { console.error('Branch stationery add rollback failed:', rollbackError.message) }
      }
      console.error('Branch stationery addition failed:', error.message)
      if (error.status === 409) {
        const match = error.message.match(/Only (\d+)/)
        const available = match ? match[1] : '0'
        return res.status(400).json({ error: `Master stock only ${available} left, cannot allocate ${quantity}.` })
      }
      return res.status(500).json({ error: 'Unable to add stock to this branch.' })
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
