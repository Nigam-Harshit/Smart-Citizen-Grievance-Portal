const express = require('express');
const router = express.Router();
const {
    getGrievances,
    getGrievanceById,
    getGrievancePhoto,
    createGrievance,
    updateGrievance,
    generateInsights,
    getInsights
} = require('../controllers/grievanceController');
const { protect, adminOrManager } = require('../middleware/authMiddleware');
const { uploadSinglePhoto } = require('../middleware/uploadMiddleware');
const { photoAccessLimiter, createGrievanceLimiter } = require('../middleware/rateLimiter');

router.route('/')
    .get(protect, getGrievances)
    .post(protect, createGrievanceLimiter, uploadSinglePhoto, createGrievance);

// Complaint Risk Analysis Engine endpoints
router.post('/risk-analysis/generate', protect, adminOrManager, generateInsights);
router.get('/risk-analysis', protect, adminOrManager, getInsights);
router.post('/admin/risk-analysis', protect, adminOrManager, generateInsights);
router.get('/admin/risk-analysis', protect, adminOrManager, getInsights);

// Backward compatibility aliases
router.post('/insights/generate', protect, adminOrManager, generateInsights);
router.get('/insights', protect, adminOrManager, getInsights);

router.get('/:id/photo', protect, photoAccessLimiter, getGrievancePhoto);

router.route('/:id')
    .get(protect, getGrievanceById)
    .put(protect, updateGrievance);

module.exports = router;
