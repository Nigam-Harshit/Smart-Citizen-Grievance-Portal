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

module.exports = {
    photoAccessLimiter
};
