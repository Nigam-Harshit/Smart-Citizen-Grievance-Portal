const express = require('express');
const router = express.Router();
const {
    registerUser,
    createStaffUser,
    loginUser,
    getMe,
    updateProfile,
    forgotPassword,
    resetPassword,
    getStaffUsers
} = require('../controllers/authController');
const { protect, admin, officerOrAdmin } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resetToken', resetPassword);

// Admin / Officer management
router.post('/create-staff', protect, admin, createStaffUser);
router.get('/staff', protect, officerOrAdmin, getStaffUsers);

module.exports = router;
