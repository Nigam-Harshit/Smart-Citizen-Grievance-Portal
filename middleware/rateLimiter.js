const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for secure evidence photo presigned URL requests.
 * Allows generous normal browsing/reloading (120 requests per 15 minutes per IP)
 * while mitigating automated harvesting or scraping loops.
 */
const photoAccessLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 120, // Limit each IP to 120 requests per windowMs
    standardHeaders: true, // Return standard RateLimit-* headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
    message: {
        message: 'Too many evidence photo requests from this IP. Please try again after 15 minutes.'
    }
});

/**
 * Rate limiter for grievance submissions (POST /api/grievances).
 * Caps submissions per IP to prevent spamming, DoS attacks,
 * and memory exhaustion from multipart file uploads and Sharp image processing.
 */
const createGrievanceLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 60, // Limit each IP to 60 grievance submissions per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    message: {
        message: 'Too many grievance submissions from this IP. Please try again after 15 minutes.'
    }
});

/**
 * Rate limiter for administrative maintenance routes (/api/admin-maintenance/*).
 * Strictly throttles requests (30 requests per 15 minutes per IP)
 * to prevent automated brute-forcing of maintenance secrets.
 */
const maintenanceLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // Limit each IP to 30 maintenance requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    message: {
        message: 'Too many maintenance requests from this IP. Please try again after 15 minutes.'
    }
});

module.exports = {
    photoAccessLimiter,
    createGrievanceLimiter,
    maintenanceLimiter
};

