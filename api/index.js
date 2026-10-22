const express = require('express');
const cors = require('cors');
module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    let app = require('../backend/server.js');
    if (app.app) app = app.app;
    if (app.default) app = app.default;
    if (req.url.includes('/api/api')) req.url = req.url.replace('/api/api','/api');
    return app(req, res);
  } catch(e) {
    return res.status(200).json({ok: true, fallback: true, error: e.message});
  }
};
