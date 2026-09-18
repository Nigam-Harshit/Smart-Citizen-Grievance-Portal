const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { normalizeRole, ROLES } = require('../utils/roleHelper');

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

            // Centralized role normalization at authentication boundary
            if (req.user.role) {
                req.user.role = normalizeRole(req.user.role);
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
        const normalizedUserRole = normalizeRole(req.user.role);
        const normalizedAllowed = rolesArray.map(r => normalizeRole(r));

        if (normalizedAllowed.includes(normalizedUserRole)) {
            return next();
        } else {
            return res.status(403).json({ message: `Access forbidden for role ${req.user.role}` });
        }
    };
};

const admin = (req, res, next) => {
    const role = normalizeRole(req.user && req.user.role);
    if (role === ROLES.ADMIN) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};

const adminOrManager = (req, res, next) => {
    const role = normalizeRole(req.user && req.user.role);
    if (role === ROLES.ADMIN || role === ROLES.MANAGER) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as admin or manager' });
    }
};

const officerOrAdmin = (req, res, next) => {
    const role = normalizeRole(req.user && req.user.role);
    if (role === ROLES.ADMIN || role === ROLES.MANAGER || role === ROLES.OFFICER) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as staff/officer or admin' });
    }
};

const citizenOnly = (req, res, next) => {
    const role = normalizeRole(req.user && req.user.role);
    if (role === ROLES.CITIZEN) {
        next();
    } else {
        res.status(403).json({ message: 'Access restricted to citizens' });
    }
};

module.exports = { protect, requireRole, admin, adminOrManager, officerOrAdmin, citizenOnly };
