const express = require('express');
const router = express.Router();
const {
    getCitizens,
    getCitizenById,
    createCitizen,
    updateCitizen,
    deleteCitizen
} = require('../controllers/citizenController');
const { protect, admin, officerOrAdmin } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getCitizens)
    .post(protect, officerOrAdmin, createCitizen);

router.route('/:id')
    .get(protect, getCitizenById)
    .put(protect, updateCitizen)
    .delete(protect, admin, deleteCitizen);

module.exports = router;
