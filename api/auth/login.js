module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const app = require('../../backend/server.js');
    let handler = app;
    if (handler.app) handler = handler.app;
    if (handler.default) handler = handler.default;
    req.url = '/api/auth/login';
    return handler(req, res);
  } catch (error) {
    console.error('Login backend handler failed:', error);
    return res.status(500).json({ error: 'Login service is temporarily unavailable.' });
  }
};
