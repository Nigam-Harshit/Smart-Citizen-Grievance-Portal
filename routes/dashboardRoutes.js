const express = require('express');
const router = express.Router();
const { getDashboardStats, getDutyQueue } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

router.get('/stats', protect, getDashboardStats);
router.get('/duty-queue', protect, getDutyQueue);

module.exports = router;
