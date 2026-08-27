const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/auditController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/').get(protect, admin, getAuditLogs);

module.exports = router;
