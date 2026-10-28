const BRANCH_RECORD_ROUTES = [
  {
    pattern: /^\/api\/consignments\/(\d+)$/,
    table: 'consignments',
    column: 'id',
    key: 1
  },
  {
    pattern: /^\/api\/bills\/([^/]+)$/,
    table: 'bill_book',
    column: 'id',
    key: 1,
    byBillNumber: true
  },
  {
    pattern: /^\/api\/mr\/(\d+)$/,
    table: 'money_receipts',
    column: 'id',
    key: 1
  },
  {
    pattern: /^\/api\/claims\/(\d+)$/,
    table: 'claims',
    column: 'id',
    key: 1
  },
  {
    pattern: /^\/api\/gadi-challan\/(\d+)$/,
    table: 'gadi_challans',
    column: 'id',
    key: 1
  },
  {
    pattern: /^\/api\/trips\/(\d+)$/,
    table: 'trips',
    column: 'id',
    key: 1
  },
  {
    pattern: /^\/api\/rates\/(\d+)$/,
    table: 'rate_contracts',
    column: 'id',
    key: 1
  },
  {
    pattern: /^\/api\/eway-bills\/(\d+)$/,
    table: 'consignments',
    column: 'id',
    key: 1
  }
]

const BRANCH_ROUTE_PATTERNS = [
  /^\/api\/dashboard\/stats$/,
  /^\/api\/dashboard\/recent$/,
  /^\/api\/dashboard\/top-parties$/,
  /^\/api\/consignments(?:\/next-number|\/\d+)?$/,
  /^\/api\/pod$/,
  /^\/api\/ledger(?:\/[^/]+)?$/,
  /^\/api\/outstanding$/,
  /^\/api\/expenses$/,
  /^\/api\/claims(?:\/\d+)?$/,
  /^\/api\/commissions$/,
  /^\/api\/bills(?:\/[^/]+)?$/,
  /^\/api\/mr(?:\/\d+)?$/,
  /^\/api\/gate-pass$/,
  /^\/api\/gadi-challan(?:\/\d+)?$/,
  /^\/api\/manifests$/,
  /^\/api\/trips(?:\/\d+)?$/,
  /^\/api\/rates(?:\/\d+)?$/,
  /^\/api\/rates\/calculate$/,
  /^\/api\/accounts\/summary$/,
  /^\/api\/accounts\/tds-register$/,
  /^\/api\/eway-bills(?:\/\d+)?$/
]

function getRecordRoute(path) {
  for (const route of BRANCH_RECORD_ROUTES) {
    const match = path.match(route.pattern)
    if (match) return { ...route, value: match[route.key] }
  }
  return null
}

function branchIdsMatch(value, branchId) {
  if (value === undefined || value === null || value === '') return true
  return Number.isSafeInteger(Number(value)) && Number(value) === branchId
}

function createBranchAccessMiddleware(pool) {
  return async function branchAccessMiddleware(req, res, next) {
    const branchId = Number(req.user?.branch_id)
    const branchSlug = req.user?.branch_slug

    if (!Number.isSafeInteger(branchId) || branchId < 1 || typeof branchSlug !== 'string') {
      return res.status(403).json({ error: 'Branch access is not valid for this session.' })
    }

    if (req.headers['x-branch-slug'] && req.headers['x-branch-slug'] !== branchSlug) {
      return res.status(403).json({ error: 'This session is not authorized for the requested branch.' })
    }

    if (!BRANCH_ROUTE_PATTERNS.some((pattern) => pattern.test(req.path))) {
      return res.status(403).json({ error: 'This endpoint is not available to branch staff.' })
    }

    if (!branchIdsMatch(req.query?.branch_id, branchId) || !branchIdsMatch(req.body?.branch_id, branchId)) {
      return res.status(403).json({ error: 'You can only access data assigned to your branch.' })
    }

    try {
      const branchResult = await pool.query(
        `SELECT id, branch_code
         FROM branches
         WHERE id = $1 AND url_slug = $2
           AND COALESCE(is_active, TRUE) = TRUE
           AND COALESCE(branch_login_enabled, FALSE) = TRUE`,
        [branchId, branchSlug]
      );
      const branch = branchResult.rows[0]
      if (!branch) return res.status(401).json({ error: 'Branch access has been disabled.' })
      if (
        (req.query?.branch_code && String(req.query.branch_code).toUpperCase() !== String(branch.branch_code).toUpperCase()) ||
        (req.body?.branch_code && String(req.body.branch_code).toUpperCase() !== String(branch.branch_code).toUpperCase())
      ) {
        return res.status(403).json({ error: 'You can only access data assigned to your branch.' })
      }

      req.user.branch_id = branchId
      req.user.branch_code = branch.branch_code
      if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
        req.body.branch_id = branchId
        req.body.branch_code = branch.branch_code
      }

      const recordRoute = req.path === '/api/bills/last-serial' ? null : getRecordRoute(req.path)
      if (recordRoute) {
        const column = recordRoute.byBillNumber && !/^\d+$/.test(recordRoute.value) ? 'bill_no' : recordRoute.column
        const result = await pool.query(
          `SELECT branch_id FROM ${recordRoute.table} WHERE ${column} = $1`,
          [recordRoute.value]
        )
        if (!result.rows[0]) return res.status(404).json({ error: 'Record not found.' })
        if (Number(result.rows[0].branch_id) !== branchId) {
          return res.status(403).json({ error: 'You can only access data assigned to your branch.' })
        }
      }

      const relatedLrNumbers = []
      if (req.path === '/api/pod' || req.path === '/api/claims' || req.path === '/api/gadi-challan') {
        if (req.body?.lr_no) relatedLrNumbers.push(req.body.lr_no)
      }
      if (req.path === '/api/manifests' && typeof req.body?.lr_nos === 'string') {
        relatedLrNumbers.push(...req.body.lr_nos.split(',').map((value) => value.trim()).filter(Boolean))
      }
      if (req.path === '/api/bills' || /^\/api\/bills\/\d+$/.test(req.path)) {
        if (Array.isArray(req.body?.items)) {
          relatedLrNumbers.push(...req.body.items.map((item) => item?.lr_no).filter(Boolean))
        }
        if (typeof req.body?.lr_nos === 'string') {
          relatedLrNumbers.push(...req.body.lr_nos.split(',').map((value) => value.trim()).filter(Boolean))
        }
      }

      for (const lrNo of new Set(relatedLrNumbers)) {
        const result = await pool.query(
          'SELECT id FROM consignments WHERE lr_no = $1 AND branch_id = $2',
          [lrNo, branchId]
        )
        if (!result.rows.length) {
          return res.status(403).json({ error: 'Referenced bilty does not belong to your branch.' })
        }
      }

      if (req.path === '/api/mr') {
        const references = [
          ['consignments', 'id', req.body?.bilty_id],
          ['consignments', 'lr_no', req.body?.bilty_lr_no],
          ['bill_book', 'id', req.body?.bill_id],
          ['bill_book', 'bill_no', req.body?.bill_no]
        ]
        for (const [table, column, value] of references) {
          if (value === undefined || value === null || value === '') continue
          const result = await pool.query(
            `SELECT id FROM ${table} WHERE ${column} = $1 AND branch_id = $2`,
            [value, branchId]
          )
          if (!result.rows.length) {
            return res.status(403).json({ error: 'Referenced record does not belong to your branch.' })
          }
        }
      }

      return next()
    } catch (err) {
      console.error('Branch access check failed:', err)
      return res.status(500).json({ error: 'Unable to verify branch data access.' })
    }
  }
}

module.exports = createBranchAccessMiddleware
