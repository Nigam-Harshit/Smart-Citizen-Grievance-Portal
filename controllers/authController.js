const User = require('../models/User');
const Citizen = require('../models/Citizen');
const jwt = require('jsonwebtoken');
const { logAudit } = require('./auditController');
const { normalizeRole } = require('../utils/roleHelper');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

const { getCanonicalCitizen } = require('../utils/identityHelper');

// Public registration - strictly locks role to 'citizen', requires name, email, password only
const registerUser = async (req, res) => {
    try {
        const { name, email, password, phone, contact, address } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please provide full name, email, and password' });
        }

        if (password.length < 3) {
            return res.status(400).json({ message: 'Password must be at least 3 characters' });
        }

        const normEmail = email.toLowerCase().trim();
        const userExists = await User.findOne({ email: normEmail });
        if (userExists) {
            return res.status(400).json({ message: 'This ID is already registered. Please use a different ID.' });
        }

        // Public registration is ALWAYS forced to 'citizen'
        const user = await User.create({
            name,
            email: normEmail,
            password,
            phone: phone || contact || '',
            role: 'citizen',
            scope: 'All'
        });

        // Get or create canonical Citizen profile (links existing if present by email)
        const citizen = await getCanonicalCitizen({
            userId: user._id,
            email: normEmail,
            name,
            phone: phone || contact || '',
            address: address || ''
        });

        user.linkedCitizenId = citizen._id;
        await user.save();

        await logAudit(user._id, 'Citizen Register', `New citizen account registered: ${user.name}.`);

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            scope: user.scope || 'All',
            linkedCitizenId: citizen._id,
            token: generateToken(user._id)
        });
    } catch (error) {
        console.error('Registration Error:', error);
        if (error.code === 11000 || (error.name === 'MongoServerError' && error.code === 11000)) {
            return res.status(400).json({ message: 'This ID is already registered. Please use a different ID.' });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Server error during registration' });
    }
};

// Admin endpoint to create Staff / Officer / Manager / Admin accounts with scope
const createStaffUser = async (req, res) => {
    try {
        const { name, email, password, role, scope, phone } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: 'Please provide name, email, password and role' });
        }

        if (password.length < 3) {
            return res.status(400).json({ message: 'Password must be at least 3 characters' });
        }

        const canonicalRole = normalizeRole(role);
        const validStaffRoles = ['admin', 'manager', 'officer'];
        if (!validStaffRoles.includes(canonicalRole)) {
            return res.status(400).json({ message: 'Invalid role for staff creation' });
        }

        const normEmail = email.toLowerCase().trim();
        const userExists = await User.findOne({ email: normEmail });
        if (userExists) {
            return res.status(400).json({ message: 'This ID is already registered. Please use a different ID.' });
        }

        const user = await User.create({
            name,
            email: normEmail,
            password,
            phone: phone || '',
            role: canonicalRole,
            scope: scope || 'All'
        });

        await logAudit(req.user._id, 'Create Staff User', `Admin ${req.user.name} created new ${role} account: ${name} (Scope: ${user.scope}).`);

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            scope: user.scope
        });
    } catch (error) {
        console.error('Create Staff Error:', error);
        if (error.code === 11000 || (error.name === 'MongoServerError' && error.code === 11000)) {
            return res.status(400).json({ message: 'This ID is already registered. Please use a different ID.' });
        }
        res.status(500).json({ message: error.message });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        const normEmail = email.toLowerCase().trim();
        const user = await User.findOne({
            $or: [
                { email: normEmail },
                { email: email.trim() },
                { email: { $regex: new RegExp(`^${normEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
            ]
        }).select('+password');

        if (user && (await user.matchPassword(password))) {
            await logAudit(user._id, 'User Login', `${user.role.toUpperCase()} successfully authenticated.`);
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                role: normalizeRole(user.role),
                scope: user.scope || 'All',
                linkedCitizenId: user.linkedCitizenId,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: error.message || 'Server error during login' });
    }
};

const getMe = async (req, res) => {
    try {
        const user = {
            _id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            phone: req.user.phone,
            notifications: req.user.notifications,
            role: req.user.role,
            role: normalizeRole(req.user.role),
            scope: req.user.scope || 'All',
            linkedCitizenId: req.user.linkedCitizenId
        };

        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const resetToken = user.getResetPasswordToken();

        await user.save({ validateBeforeSave: false });

        const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;

        const message = `You are receiving this email because you requested a password reset. Please click on the link or make a PUT request to: \n\n ${resetUrl}`;

        try {
            const sendEmail = require('../utils/sendEmail');

            if (!process.env.SMTP_HOST) {
                console.log('Skipping email send (No SMTP Config). Reset Link:', resetUrl);
                return res.status(200).json({ success: true, data: 'Email sent (Simulation: Check Server Console)' });
            }

            await sendEmail({
                email: user.email,
                subject: 'Password reset token',
                message
            });

            res.status(200).json({ success: true, data: 'Email sent' });
        } catch (err) {
            console.error(err);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;

            await user.save({ validateBeforeSave: false });

            return res.status(500).json({ message: 'Email could not be sent' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const resetPassword = async (req, res) => {
    const crypto = require('crypto');

    const resetPasswordToken = crypto
        .createHash('sha256')
        .update(req.params.resetToken)
        .digest('hex');

    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
        return res.status(400).json({ message: 'Invalid token' });
    }

    if (!req.body.password || req.body.password.length < 3) {
        return res.status(400).json({ message: 'Password must be at least 3 characters' });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(201).json({
        success: true,
        token: generateToken(user._id)
    });
};

const updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;
            user.phone = req.body.phone !== undefined ? req.body.phone : user.phone;
            user.notifications = req.body.notifications !== undefined ? req.body.notifications : user.notifications;

            const updatedUser = await user.save();
            await logAudit(user._id, 'Profile Update', `${user.name} updated their profile settings.`);

            // Also update linked citizen record if citizen
            if (user.linkedCitizenId) {
                const citizenUpdate = {
                    name: updatedUser.name,
                    email: updatedUser.email,
                    contact: updatedUser.phone
                };
                if (req.body.address !== undefined) {
                    citizenUpdate.address = req.body.address;
                }
                await Citizen.findByIdAndUpdate(user.linkedCitizenId, citizenUpdate);
            }

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone,
                notifications: updatedUser.notifications,
                role: updatedUser.role,
                role: normalizeRole(updatedUser.role),
                scope: updatedUser.scope || 'All',
                linkedCitizenId: updatedUser.linkedCitizenId,
                token: generateToken(updatedUser._id)
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getStaffUsers = async (req, res) => {
    try {
        const officers = await User.find({ role: { $in: ['admin', 'manager', 'officer', 'field_officer'] } }).select('name email role scope phone');
        res.status(200).json(officers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getOfficers = async (req, res) => {
    try {
        const officers = await User.find({ role: { $in: ['officer', 'field_officer'] } }).select('name email role scope phone');
        res.status(200).json(officers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    registerUser,
    createStaffUser,
    loginUser,
    getMe,
    updateProfile,
    forgotPassword,
    resetPassword,
    getStaffUsers,
    getOfficers
};
