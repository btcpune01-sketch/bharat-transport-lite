import { expect, test } from '@playwright/test'

test('TEST 1 - Bilty save, list, print, and dashboard', async ({ page }) => {
  let savedBilty

  await page.addInitScript(() => {
    localStorage.setItem('token', 'playwright-local-test-token')
    localStorage.setItem('user', JSON.stringify({
      id: 1,
      username: 'playwright-test',
      role: 'operator'
    }))
    window.__printCalls = 0
    window.print = () => { window.__printCalls += 1 }
  })

  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace(/^\/api/, '')
    const method = request.method()
    let response

    if (method === 'POST' && path === '/consignments') {
      savedBilty = {
        ...request.postDataJSON(),
        id: 1,
        status: 'Booked'
      }
      response = savedBilty
    } else if (method === 'GET' && path === '/consignments/next-number') {
      response = { lr_no: 'TEST-00001' }
    } else if (method === 'GET' && path === '/consignments/1') {
      response = savedBilty || {}
    } else if (method === 'GET' && path === '/consignments') {
      response = savedBilty ? [savedBilty] : []
    } else if (method === 'GET' && path === '/customers') {
      response = []
    } else if (method === 'GET' && path === '/dashboard/stats') {
      response = { success: true, today_lr: savedBilty ? 1 : 0 }
    } else if (method === 'GET' && path === '/dashboard/recent') {
      response = {
        success: true,
        bilties: savedBilty ? [savedBilty] : [],
        receipts: [],
        claims: []
      }
    } else if (method === 'GET' && path === '/dashboard/top-parties') {
      response = { success: true, data: [] }
    } else if (method === 'GET') {
      response = { data: [] }
    } else {
      response = { success: true }
    }

    await route.fulfill({ status: 200, json: response })
  })

  await page.goto('/#/consignments/new')
  await expect(page.getByRole('heading', { name: 'Create New Bilty (LR)' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save Bilty TEST-00001' })).toBeEnabled()

  await page.getByRole('combobox').nth(0).fill('PUNE')
  await page.getByRole('button', { name: "+ Add new city 'Pune'" }).click()
  await page.getByRole('combobox').nth(1).fill('MUM')
  await page.getByRole('option', { name: 'MUM - Mumbai' }).click()
  await page.locator('input[name="from_name"]').fill('PUNE')
  await page.locator('input[name="to_name"]').fill('MUMBAI')
  await page.locator('input[name="consignor_name"]').fill('TEST AUTO')
  await page.locator('input[name="consignor_mobile"]').fill('9876543210')
  await page.locator('textarea[name="consignor_address"]').fill('Pune')
  await page.locator('input[name="consignee_name"]').fill('TEST RECEIVER')
  await page.locator('input[name="consignee_mobile"]').fill('9876543211')
  await page.locator('textarea[name="consignee_address"]').fill('Mumbai')
  await page.locator('input[name="vehicle_no"]').fill('MH12 AB 1234')
  await page.locator('input[name="no_of_packages"]').fill('1')
  await page.locator('textarea[name="description"]').fill('Automated test shipment')
  await page.locator('input[name="actual_weight"]').fill('10')
  await page.locator('input[name="charged_weight"]').fill('10')
  await page.locator('input[name="rate"]').fill('150')

  await page.getByRole('button', { name: 'Save Bilty TEST-00001' }).click()
  await expect(page.getByText('Bilty Saved - TEST-00001')).toBeVisible()
  expect(savedBilty?.consignor_name).toBe('TEST AUTO')
  expect(savedBilty?.vehicle_no).toBe('MH12 AB 1234')

  await expect(page).toHaveURL(/#\/consignments$/)
  await expect(page.getByRole('row').filter({ hasText: 'TEST AUTO' })).toBeVisible()
  console.log('TEST 1 - Bilty - SAVE: PASS, LIST: PASS')

  await page.goto('/#/bilty-print/1')
  await expect(page.locator('#print-area')).toContainText('TEST AUTO')
  await expect(page.locator('#print-area')).toContainText('PUNE')
  await page.getByRole('button', { name: /SAVE & PRINT/ }).click()
  await expect.poll(() => page.evaluate(() => window.__printCalls)).toBe(1)
  console.log('TEST 1 - Bilty - PRINT: PASS')

  await page.goto('/#/dashboard')
  await expect(page.getByRole('heading', { name: 'Quick Actions' })).toBeVisible()
  await expect(page.getByText(/1\s*Bilties/).first()).toBeVisible()
  console.log('TEST 1 - Bilty - DASHBOARD: PASS')
})

test('TEST 2 - Bill save, list, print, and dashboard', async ({ page }) => {
  let savedBill

  await page.addInitScript(() => {
    localStorage.setItem('token', 'playwright-local-test-token')
    localStorage.setItem('user', JSON.stringify({
      id: 1,
      username: 'playwright-test',
      role: 'operator'
    }))
    window.__printCalls = 0
    window.print = () => { window.__printCalls += 1 }
  })

  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace(/^\/api/, '')
    const method = request.method()
    let response

    if (method === 'POST' && path === '/bills') {
      savedBill = { ...request.postDataJSON(), id: 1 }
      response = savedBill
    } else if (method === 'GET' && path === '/bills/last-serial') {
      response = { lastSerial: 0 }
    } else if (method === 'GET' && path === '/bills/1') {
      response = savedBill || {}
    } else if (method === 'GET' && path === '/bills') {
      response = { data: savedBill ? [savedBill] : [] }
    } else if (method === 'GET' && path === '/dashboard/stats') {
      response = { success: true, total_bills: savedBill ? 1 : 0 }
    } else if (method === 'GET' && path === '/dashboard/recent') {
      response = { success: true, bilties: [], receipts: [], claims: [] }
    } else if (method === 'GET' && path === '/dashboard/top-parties') {
      response = { success: true, data: [] }
    } else if (method === 'GET') {
      response = { data: [] }
    } else {
      response = { success: true }
    }

    await route.fulfill({ status: 200, json: response })
  })

  await page.goto('/#/bill-entry')
  await expect(page.getByPlaceholder('M/s PARTY NAME')).toBeVisible()
  await page.getByPlaceholder('M/s PARTY NAME').fill('TEST AUTO')
  await page.locator('input[placeholder="RJ 18 GA XXXX"]').fill('MH12 AB 1234')
  page.once('dialog', async dialog => {
    expect(dialog.message()).toBe('Bill saved successfully.')
    await dialog.accept()
  })
  await page.getByRole('button', { name: 'Save to List' }).click()
  await expect(page).toHaveURL(/#\/bills\/1\/print$/)
  await expect(page.locator('.invoice-wrapper')).toContainText('TEST AUTO')
  console.log('TEST 2 - Bill - SAVE: PASS, PRINT DATA: PASS')

  await page.getByRole('button', { name: /Print/ }).click()
  await expect.poll(() => page.evaluate(() => window.__printCalls)).toBe(1)
  console.log('TEST 2 - Bill - PRINT: PASS')

  await page.goto('/#/bills')
  await expect(page.getByRole('row').filter({ hasText: 'TEST AUTO' })).toBeVisible()
  console.log('TEST 2 - Bill - LIST: PASS')

  await page.goto('/#/dashboard')
  await expect(page.getByRole('heading', { name: 'Quick Actions' })).toBeVisible()
  console.log('TEST 2 - Bill - DASHBOARD: PASS')
})

test('TEST 3 - MR save, list, print, and dashboard', async ({ page }) => {
  let savedReceipt

  await page.addInitScript(() => {
    localStorage.setItem('token', 'playwright-local-test-token')
    localStorage.setItem('user', JSON.stringify({
      id: 1,
      username: 'playwright-test',
      role: 'operator'
    }))
    window.__printCalls = 0
    window.print = () => { window.__printCalls += 1 }
  })

  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace(/^\/api/, '')
    const method = request.method()
    let response

    if (method === 'POST' && path === '/mr') {
      savedReceipt = {
        ...request.postDataJSON(),
        id: 1,
        mr_no: 'MR-TEST-01'
      }
      response = savedReceipt
    } else if (method === 'GET' && path === '/mr') {
      response = { data: savedReceipt ? [savedReceipt] : [] }
    } else if (method === 'GET' && path === '/bills') {
      response = { data: [] }
    } else if (method === 'GET' && path === '/consignments') {
      response = { data: [] }
    } else if (method === 'GET' && path === '/dashboard/stats') {
      response = { success: true, total_mr: savedReceipt ? 1 : 0 }
    } else if (method === 'GET' && path === '/dashboard/recent') {
      response = { success: true, bilties: [], receipts: [], claims: [] }
    } else if (method === 'GET' && path === '/dashboard/top-parties') {
      response = { success: true, data: [] }
    } else if (method === 'GET') {
      response = { data: [] }
    } else {
      response = { success: true }
    }

    await route.fulfill({ status: 200, json: response })
  })

  await page.goto('/#/mr/create')
  await expect(page.getByRole('heading', { name: /Create Money Receipt/ })).toBeVisible()
  await page.locator('input[name="party_name"]').fill('TEST AUTO')
  await page.locator('input[name="amount"]').fill('1500')
  page.once('dialog', async dialog => {
    expect(dialog.message()).toBe('MR Created Successfully! MR No: MR-TEST-01')
    await dialog.accept()
  })
  await page.getByRole('button', { name: /Create Money Receipt/ }).click()
  await expect(page).toHaveURL(/#\/mr$/)
  await expect(page.getByRole('row').filter({ hasText: 'TEST AUTO' })).toBeVisible()
  console.log('TEST 3 - MR - SAVE: PASS, LIST: PASS')

  await page.locator('button[title="Print MR"]').click()
  await expect(page).toHaveURL(/#\/mr\/print\?mr_no=MR-TEST-01$/)
  await expect(page.getByText('MR-TEST-01', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /Print/ }).click()
  await expect.poll(() => page.evaluate(() => window.__printCalls)).toBe(1)
  console.log('TEST 3 - MR - PRINT: PASS')

  await page.goto('/#/dashboard')
  await expect(page.getByRole('heading', { name: 'Quick Actions' })).toBeVisible()
  console.log('TEST 3 - MR - DASHBOARD: PASS')
})

test('TEST 4 - Gadi Challan save, list, print, and dashboard', async ({ page }) => {
  let savedChallan

  await page.addInitScript(() => {
    localStorage.setItem('token', 'playwright-local-test-token')
    localStorage.setItem('user', JSON.stringify({
      id: 1,
      username: 'playwright-test',
      role: 'operator'
    }))
    window.__printCalls = 0
    window.print = () => { window.__printCalls += 1 }
  })

  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace(/^\/api/, '')
    const method = request.method()
    let response

    if (method === 'POST' && path === '/gadi-challan') {
      savedChallan = {
        ...request.postDataJSON(),
        id: 1,
        challan_no: 'GC-TEST-01'
      }
      response = savedChallan
    } else if (method === 'GET' && path === '/gadi-challan/1') {
      response = savedChallan || {}
    } else if (method === 'GET' && path === '/gadi-challan') {
      response = { data: savedChallan ? [savedChallan] : [] }
    } else if (method === 'GET' && path === '/consignments') {
      response = {
        data: [{
          id: 7,
          lr_no: 'LR-TEST-01',
          status: 'Booked',
          consignor_name: 'TEST AUTO',
          consignee_name: 'TEST RECEIVER',
          from_name: 'PUNE',
          to_name: 'MUMBAI',
          grand_total: 1500,
          no_of_packages: 1,
          actual_weight: 10
        }]
      }
    } else if (method === 'GET' && path === '/dashboard/stats') {
      response = { success: true, total_gadi_challan: savedChallan ? 1 : 0 }
    } else if (method === 'GET' && path === '/dashboard/recent') {
      response = { success: true, bilties: [], receipts: [], claims: [] }
    } else if (method === 'GET' && path === '/dashboard/top-parties') {
      response = { success: true, data: [] }
    } else if (method === 'GET') {
      response = { data: [] }
    } else {
      response = { success: true }
    }

    await route.fulfill({ status: 200, json: response })
  })

  await page.goto('/#/gadi-challan')
  await page.getByRole('button', { name: /Create New Challan/ }).click()
  await expect(page.getByRole('heading', { name: /Create New Gadi Challan/ })).toBeVisible()
  await page.locator('select[name="lr_no"]').selectOption('LR-TEST-01')
  await page.locator('input[name="vehicle_no"]').fill('MH12 AB 1234')
  await page.locator('input[name="driver_name"]').fill('TEST DRIVER')
  await page.locator('input[name="driver_mobile"]').fill('9876543210')
  await page.locator('input[name="freight_amount"]').fill('1500')
  page.once('dialog', async dialog => {
    expect(dialog.message()).toBe('Gadi Challan created successfully!')
    await dialog.accept()
  })
  await page.getByRole('button', { name: /Create Challan/ }).last().click()
  await expect(page.getByRole('row').filter({ hasText: 'GC-TEST-01' })).toBeVisible()
  console.log('TEST 4 - Gadi Challan - SAVE: PASS, LIST: PASS')

  await page.getByRole('button', { name: '🖨️ Print' }).click()
  await expect(page).toHaveURL(/#\/gadi-challan-print\/1$/)
  await expect(page.getByText('MH12 AB 1234')).toBeVisible()
  await page.getByRole('button', { name: /Print/ }).click()
  await expect.poll(() => page.evaluate(() => window.__printCalls)).toBe(1)
  console.log('TEST 4 - Gadi Challan - PRINT: PASS')

  await page.goto('/#/dashboard')
  await expect(page.getByRole('heading', { name: 'Quick Actions' })).toBeVisible()
  console.log('TEST 4 - Gadi Challan - DASHBOARD: PASS')
})

test('TEST 5 - Branch Payment save, list, and summary', async ({ page }) => {
  let savedPayment

  await page.addInitScript(() => {
    localStorage.setItem('token', 'playwright-local-test-token')
    localStorage.setItem('user', JSON.stringify({
      id: 1,
      username: 'playwright-test',
      role: 'admin'
    }))
    window.__printCalls = 0
    window.print = () => { window.__printCalls += 1 }
  })

  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace(/^\/api/, '')
    const method = request.method()
    let response

    if (method === 'POST' && path === '/branch-payments') {
      savedPayment = {
        ...request.postDataJSON(),
        id: 1,
        payment_date: request.postDataJSON().paymentDate,
        payment_mode: request.postDataJSON().paymentMode
      }
      response = savedPayment
    } else if (method === 'GET' && path === '/branch-payments') {
      response = {
        payments: savedPayment ? [savedPayment] : [],
        total: Number(savedPayment?.amount || 0)
      }
    } else if (method === 'GET' && path === '/branch-payments/summary') {
      response = {
        summary: {
          total_given: Number(savedPayment?.amount || 0),
          total_received: 0,
          current_balance: Number(savedPayment?.amount || 0)
        },
        branches: [{
          id: 1,
          branch_name: 'Pune',
          branch_code: 'PUN',
          total_given: Number(savedPayment?.amount || 0),
          total_received: 0,
          current_balance: Number(savedPayment?.amount || 0)
        }]
      }
    } else if (method === 'GET' && path === '/branches') {
      response = { data: [{ id: 1, branch_name: 'Pune', branch_code: 'PUN' }] }
    } else if (method === 'GET' && path === '/dashboard/stats') {
      response = { success: true }
    } else if (method === 'GET' && path === '/dashboard/recent') {
      response = { success: true, bilties: [], receipts: [], claims: [] }
    } else if (method === 'GET' && path === '/dashboard/top-parties') {
      response = { success: true, data: [] }
    } else if (method === 'GET') {
      response = { data: [] }
    } else {
      response = { success: true }
    }

    await route.fulfill({ status: 200, json: response })
  })

  await page.goto('/#/branch-payments')
  await page.locator('select').first().selectOption('Pune')
  await page.locator('input[placeholder="0.00"]').fill('1500')
  await page.locator('input[placeholder="UTR / Cheque No."]').fill('TEST-REF-01')
  page.once('dialog', async dialog => {
    expect(dialog.message()).toBe('Payment सफलतापूर्वक Save हो गई!')
    await dialog.accept()
  })
  await page.getByRole('button', { name: 'Save Payment' }).click()
  await expect(page.getByRole('row').filter({ hasText: 'TEST-REF-01' })).toBeVisible()
  await expect(page.getByText('1 transactions')).toBeVisible()
  console.log('TEST 5 - Branch Payment - SAVE: PASS, LIST: PASS, PRINT: N/A')

  await page.goto('/#/branch-payments/summary')
  await expect(page.getByRole('heading', { name: 'Branch Payment Summary' })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'Pune' })).toContainText('1,500')
  await page.goto('/#/dashboard')
  await expect(page.getByRole('heading', { name: 'Quick Actions' })).toBeVisible()
  console.log('TEST 5 - Branch Payment - SUMMARY: PASS, DASHBOARD LOAD: PASS')
  expect(await page.evaluate(() => window.__printCalls)).toBe(0)
})

test('TMS dashboard shows role-specific administration and branch user tools', async ({ page }) => {
  const dashboardRequests = []
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname.replace(/^\/api/, '')
    if (path === '/dashboard/stats') {
      dashboardRequests.push({
        branch: url.searchParams.get('branch'),
        branchId: url.searchParams.get('branch_id')
      })
    }
    const response = path === '/dashboard/stats'
      ? { success: true, today_lr: 0, month_lr: 0, total_branches: 1 }
      : path === '/branches'
        ? { data: [{ id: 1, branch_name: 'Ahmedabad', url_slug: 'ahmedabad' }] }
        : path === '/branch/users'
          ? { data: [{ id: 1, username: 'branch-operator', full_name: 'Branch Operator', role: 'operator', is_active: true }] }
          : path === '/stock' ? { data: [] } : { data: [] }
    await route.fulfill({ status: 200, json: response })
  })

  await page.addInitScript(() => {
    localStorage.setItem('token', 'playwright-admin-test-token')
    localStorage.setItem('user', JSON.stringify({ id: 1, username: 'admin', role: 'admin' }))
  })
  await page.goto('/#/admin/dashboard')
  await expect(page.getByText('ADMIN', { exact: true })).toBeVisible()
  await expect(page.getByText('TMS 6.0 Live - Global')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Quick Actions' })).toBeVisible()
  await page.getByLabel('Switch to branch dashboard').selectOption('ahmedabad')
  await expect(page).toHaveURL(/#\/branch\/ahmedabad\/dashboard$/)
  await expect(page.getByText('AHMEDABAD', { exact: true })).toBeVisible()
  await expect.poll(() => dashboardRequests.some((request) =>
    request.branch === 'ahmedabad' && request.branchId === '1'
  )).toBe(true)
  await page.getByRole('button', { name: 'Back to Admin' }).click()
  await expect(page).toHaveURL(/#\/admin\/dashboard$/)
  await page.getByRole('button', { name: 'Administration' }).click()
  await expect(page.getByRole('link', { name: 'Branch Management' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Global User Management' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Backup & Restore' })).toBeVisible()

  await page.evaluate(() => {
    localStorage.setItem('token', 'playwright-branch-test-token')
    localStorage.setItem('user', JSON.stringify({ id: 1, username: 'ahmedabad', role: 'branch', branch_id: 1 }))
    localStorage.setItem('branch_session', JSON.stringify({
      token: 'playwright-branch-test-token',
      branch: { id: 1, url_slug: 'ahmedabad', branch_name: 'Ahmedabad' }
    }))
  })
  await page.goto('/#/branch/ahmedabad/dashboard')
  await expect(page.getByRole('heading', { name: 'Quick Actions' })).toBeVisible()
  await page.getByRole('button', { name: 'Administration' }).click()
  await expect(page.getByRole('link', { name: 'Branch User Management' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Stationery Stock (Branch)' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Branch Management' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Backup & Restore' })).toHaveCount(0)
  await page.getByRole('link', { name: 'Branch User Management' }).click()
  await expect(page).toHaveURL(/#\/branch\/ahmedabad\/user-management$/)
  await expect(page.getByRole('heading', { name: 'Branch User Management' })).toBeVisible()
  await expect(page.getByText('branch-operator')).toBeVisible()
  await page.goto('/#/branch/ahmedabad/dashboard')
  await page.getByRole('button', { name: 'Notifications' }).click()
  await expect(page.getByText('No notification feed is configured.')).toBeVisible()
  await page.locator('header button[aria-expanded]').last().click()
  await expect(page.getByRole('button', { name: 'Profile' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible()
  await page.getByRole('button', { name: 'Logout' }).click()
  await expect(page).toHaveURL(/#\/login$/)
})
