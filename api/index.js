const express = require('express');
const cors = require('cors');
let app;
try {
  // Try to load your backend app
  app = require('../backend/server.js');
  // If server.js exports {app} or {default}
  if (app && app.app) app = app.app;
  if (app && app.default) app = app.default;
} catch (e) {
  console.error('Failed to load backend, creating fallback', e);
  app = express();
  app.use(cors({origin: '*'}));
  app.use(express.json());
  app.get('/api', (req,res)=>res.json({ok:true}));
}

module.exports = (req, res) => {
  // Fix double /api
  if (req.url.includes('/api/api')) req.url = req.url.replace('/api/api','/api');
  // Enable CORS for all
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  return app(req, res);
};
