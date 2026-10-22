const app = require('../backend/server.js');
module.exports = (req, res) => {
  // Fix double /api/api
  if (req.url.startsWith('/api/api/')) {
    req.url = req.url.replace('/api/api/', '/api/');
  }
  if (req.url.startsWith('/api/api')) {
     req.url = req.url.replace('/api/api', '/api');
  }
  return app(req, res);
};
