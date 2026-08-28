const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = await User.findById(decoded.id);
            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            return next();
        } catch (error) {
            console.error('JWT Auth Middleware Error:', error.message);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const requireRole = (allowedRoles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
        const normalizedUserRole = req.user.role === 'field_officer' ? 'officer' : req.user.role;
        const normalizedAllowed = rolesArray.map(r => r === 'field_officer' ? 'officer' : r);

        if (normalizedAllowed.includes(normalizedUserRole)) {
            return next();
        } else {
            return res.status(403).json({ message: `Access forbidden for role ${req.user.role}` });
        }
    };
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};

const adminOrManager = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'manager')) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as admin or manager' });
    }
};

const officerOrAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'manager' || req.user.role === 'officer' || req.user.role === 'field_officer')) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as staff/officer or admin' });
    }
};

const citizenOnly = (req, res, next) => {
    if (req.user && req.user.role === 'citizen') {
        next();
    } else {
        res.status(403).json({ message: 'Access restricted to citizens' });
    }
};

module.exports = { protect, requireRole, admin, adminOrManager, officerOrAdmin, citizenOnly };
