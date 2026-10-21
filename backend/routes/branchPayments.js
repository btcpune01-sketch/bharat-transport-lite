const express = require('express');

// Branch payments are implemented by the authenticated PostgreSQL routes in
// server.js. Keep this compatibility router empty so the legacy unauthenticated
// implementation cannot shadow those protected routes.
module.exports = () => express.Router();
