const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 10;
const loginAttempts = new Map();
let requestsSinceCleanup = 0;

function createBranchAuthRouter(pool) {
  const router = express.Router();

  router.post('/verify', async (req, res) => {
    const now = Date.now();
    const clientIp = req.ip;
    let attempt = loginAttempts.get(clientIp);

    if (!attempt || attempt.resetAt <= now) {
      attempt = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
      loginAttempts.set(clientIp, attempt);
    }

    requestsSinceCleanup += 1;
    if (requestsSinceCleanup >= 256) {
      for (const [ip, entry] of loginAttempts) {
        if (entry.resetAt <= now) loginAttempts.delete(ip);
      }
      requestsSinceCleanup = 0;
    }

    if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
      res.set('Retry-After', String(Math.ceil((attempt.resetAt - now) / 1000)));
      return res.status(429).json({ success: false, error: 'Too many login attempts. Try again later.' });
    }
    attempt.count += 1;

    const { branchSlug, username, password } = req.body || {};
    if (
      typeof branchSlug !== 'string' ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(branchSlug) ||
      typeof username !== 'string' ||
      !username.trim() ||
      typeof password !== 'string' ||
      !password
    ) {
      return res.status(400).json({ success: false, error: 'Branch slug, username, and password are required.' });
    }

    try {
      const result = await pool.query(
        `SELECT id, branch_code, branch_name, city, state, url_slug, is_active,
                branch_login_enabled, login_credentials
         FROM branches
         WHERE url_slug = $1`,
        [branchSlug]
      );
      const branch = result.rows[0];
      const credentials = branch?.login_credentials;

      if (
        !branch ||
        !branch.is_active ||
        !branch.branch_login_enabled ||
        !credentials ||
        typeof credentials.username !== 'string' ||
        typeof credentials.password !== 'string' ||
        credentials.username !== username.trim()
      ) {
        return res.status(401).json({ success: false, error: 'Invalid branch login credentials.' });
      }

      const passwordMatches = await bcrypt.compare(password, credentials.password);
      if (!passwordMatches) {
        return res.status(401).json({ success: false, error: 'Invalid branch login credentials.' });
      }

      const safeBranch = {
        id: branch.id,
        branch_code: branch.branch_code,
        branch_name: branch.branch_name,
        city: branch.city,
        state: branch.state,
        url_slug: branch.url_slug
      };
      const token = jwt.sign(
        {
          id: branch.id,
          username: credentials.username,
          role: 'branch',
          branch_id: branch.id,
          branch_code: branch.branch_code,
          branch_slug: branch.url_slug
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.json({ success: true, branch: safeBranch, token });
    } catch (err) {
      console.error('Branch login verification failed:', err);
      return res.status(500).json({ success: false, error: 'Unable to verify branch login.' });
    }
  });

  return router;
}

module.exports = createBranchAuthRouter;
