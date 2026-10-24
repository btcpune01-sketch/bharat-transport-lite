const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 10;
const loginAttempts = new Map();
let requestsSinceCleanup = 0;

function createBranchAuthRouter(pool) {
  const router = express.Router();

  router.use((req, res, next) => {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      'Surrogate-Control': 'no-store'
    });
    next();
  });

  async function verifyLogin(req, res) {
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

    const { branchSlug: requestedSlug, username: requestedUsername, password: rawPassword } = req.body || {};
    const branchSlug = String(req.params.branchSlug || requestedSlug || '').trim().toLowerCase();
    const username = typeof requestedUsername === 'string' ? requestedUsername.trim().toLowerCase() : '';
    const password = typeof rawPassword === 'string' ? rawPassword.trim() : '';
    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(branchSlug) ||
      !username ||
      !password
    ) {
      return res.status(400).json({ success: false, error: 'Branch slug, username, and password are required.' });
    }

    try {
      const result = await pool.query(
        `SELECT id, branch_code, branch_name, city, state,
                COALESCE(NULLIF(url_slug, ''), $1) AS url_slug, COALESCE(is_active, TRUE) AS is_active,
                COALESCE(branch_login_enabled, TRUE) AS branch_login_enabled,
                login_credentials, branch_visible_password
         FROM branches
         WHERE COALESCE(NULLIF(url_slug, ''), trim(both '-' from lower(regexp_replace(trim(branch_name), '[^a-zA-Z0-9]+', '-', 'g')))) = $1
            OR trim(both '-' from lower(regexp_replace(trim(city), '[^a-zA-Z0-9]+', '-', 'g'))) = $1
            OR trim(both '-' from lower(regexp_replace(trim(branch_code), '[^a-zA-Z0-9]+', '-', 'g'))) = $1
         ORDER BY CASE WHEN lower(COALESCE(url_slug, '')) = $1 THEN 0 ELSE 1 END
         LIMIT 1`,
        [branchSlug]
      );
      const branch = result.rows[0];
      const credentials = branch?.login_credentials;

      if (!branch) {
        return res.status(401).json({ success: false, error: 'Invalid Branch.' });
      }

      console.info(`Login attempt: ${branch.url_slug} / ${username} / enabled=${branch.branch_login_enabled}`);
      if (!branch.is_active || !branch.branch_login_enabled) {
        return res.status(403).json({
          success: false,
          error: 'Login disabled, contact admin - Enable from Branch Management.'
        });
      }
      if (!credentials || typeof credentials.username !== 'string' || credentials.username.trim().toLowerCase() !== username) {
        return res.status(401).json({ success: false, error: 'Invalid ID Password.' });
      }

      const passwordMatches = typeof credentials.password === 'string'
        ? await bcrypt.compare(password, credentials.password)
        : false;
      const legacyPasswordMatches = password === branch.branch_visible_password;
      if (!passwordMatches && !legacyPasswordMatches) {
        return res.status(401).json({ success: false, error: 'Invalid ID Password.' });
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
          username,
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
  }

  router.post('/verify', verifyLogin);
  router.post('/login/:branchSlug', verifyLogin);
  router.post('/:branchSlug', verifyLogin);
  router.post('/', verifyLogin);

  return router;
}

module.exports = createBranchAuthRouter;
