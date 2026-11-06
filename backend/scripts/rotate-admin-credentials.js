require('dotenv').config();

const bcrypt = require('bcryptjs');
const getDb = require('../db');

async function rotateAdminCredentials() {
  const username = process.env.ROTATE_ADMIN_USERNAME?.trim();
  const password = process.env.ROTATE_ADMIN_PASSWORD;
  if (!username || !password) {
    throw new Error('Set ROTATE_ADMIN_USERNAME and ROTATE_ADMIN_PASSWORD to rotate the admin login.');
  }
  if (username.length > 50) {
    throw new Error('The admin username must be at most 50 characters.');
  }
  if (password.length < 12) {
    throw new Error('The admin password must be at least 12 characters.');
  }

  const pool = getDb();
  if (!pool) throw new Error('A valid PostgreSQL connection URL is required.');

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const admins = await client.query(
        `SELECT id FROM users
         WHERE LOWER(role) = 'admin' AND is_active = TRUE
         ORDER BY id
         FOR UPDATE`
      );
      if (admins.rows.length !== 1) {
        throw new Error(`Expected exactly one active admin account; found ${admins.rows.length}.`);
      }

      const adminId = admins.rows[0].id;
      const usernameConflict = await client.query(
        `SELECT id FROM users
         WHERE LOWER(username) = LOWER($1) AND id <> $2
         LIMIT 1`,
        [username, adminId]
      );
      const emailConflict = await client.query(
        `SELECT id FROM users
         WHERE LOWER(COALESCE(email, '')) = LOWER($1) AND id <> $2
         LIMIT 1`,
        [username, adminId]
      );
      if (usernameConflict.rows.length || emailConflict.rows.length) {
        throw new Error('The requested admin login is already assigned to another account.');
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      await client.query(
        `UPDATE users SET username = $1, email = $1, password = $2 WHERE id = $3`,
        [username, hashedPassword, adminId]
      );
      const verified = await client.query(
        `SELECT username, email, password FROM users WHERE id = $1`,
        [adminId]
      );
      const account = verified.rows[0];
      if (
        !account ||
        account.username.toLowerCase() !== username.toLowerCase() ||
        account.email.toLowerCase() !== username.toLowerCase() ||
        !account.password.startsWith('$2') ||
        !(await bcrypt.compare(password, account.password))
      ) {
        throw new Error('Admin credential verification failed after the database update.');
      }
      await client.query('COMMIT');
      console.info('Admin credentials rotated and hash verification passed.');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

rotateAdminCredentials().catch((error) => {
  console.error('Admin credential rotation failed:', error.message);
  process.exitCode = 1;
});
