const express = require('express');
const router = express.Router();
const {
    getGrievances,
    getGrievanceById,
    createGrievance,
    updateGrievance,
    generateInsights,
    getInsights
} = require('../controllers/grievanceController');
const { protect, adminOrManager } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getGrievances)
    .post(protect, createGrievance);

router.post('/insights/generate', protect, adminOrManager, generateInsights);
router.get('/insights', protect, adminOrManager, getInsights);

router.route('/:id')
    .get(protect, getGrievanceById)
    .put(protect, updateGrievance);

module.exports = router;
