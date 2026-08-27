const AuditLog = require('../models/AuditLog');

const getAuditLogs = async (req, res) => {
    try {
        const logs = await AuditLog.find().populate('userId', 'name role').sort('-createdAt').limit(200);
        res.status(200).json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const logAudit = async (userId, action, details) => {
    try {
        await AuditLog.create({ userId, action, details });
    } catch (error) {
        console.error('Audit Log Error:', error);
    }
};

module.exports = { getAuditLogs, logAudit };
