const express = require('express');
const router = express.Router();
const { getUpdatesByGrievance, createUpdate } = require('../controllers/grievanceUpdateController');
const { protect } = require('../middleware/authMiddleware');

router.route('/:grievanceId')
    .get(protect, getUpdatesByGrievance)
    .post(protect, createUpdate);

module.exports = router;
