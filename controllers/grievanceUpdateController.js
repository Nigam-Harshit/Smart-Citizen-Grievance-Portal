const GrievanceUpdate = require('../models/GrievanceUpdate');
const Grievance = require('../models/Grievance');
const { logAudit } = require('./auditController');
const { normalizeRole, formatRoleLabel } = require('../utils/roleHelper');

const getUpdatesByGrievance = async (req, res) => {
    try {
        const updates = await GrievanceUpdate.find({ grievanceId: req.params.grievanceId })
            .populate('userId', 'name role email')
            .populate('authorId', 'name role email')
            .sort('-createdAt');

        const formattedUpdates = updates.map(update => {
            const canonicalRole = update.authorRole || normalizeRole(update.authorId?.role || update.userId?.role || update.type);
            const authorName = update.authorName || update.authorId?.name || update.userId?.name || 'User';
            const message = update.message || update.notes || '';
            const authorId = update.authorId?._id || update.userId?._id || update.authorId || update.userId;

            return {
                _id: update._id,
                grievanceId: update.grievanceId,
                authorId,
                authorName,
                authorRole: canonicalRole, // canonical lowercase: 'admin', 'manager', 'officer', 'citizen'
                message,
                createdAt: update.createdAt,
                updatedAt: update.updatedAt,
                // Legacy fields for backward compatibility
                userId: update.userId || update.authorId,
                type: update.type || formatRoleLabel(canonicalRole),
                notes: update.notes || message,
                statusChange: update.statusChange
            };
        });

        res.status(200).json(formattedUpdates);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createUpdate = async (req, res) => {
    try {
        const grievanceId = req.params.grievanceId;
        const grievance = await Grievance.findById(grievanceId);
        if (!grievance) {
            return res.status(404).json({ message: 'Grievance not found' });
        }

        const message = (req.body.message || req.body.notes || '').trim();
        if (!message) {
            return res.status(400).json({ message: 'Please provide a message or note for the timeline update' });
        }

        // CRITICAL SECURITY ENFORCEMENT:
        // NEVER allow frontend role selection or request body to override JWT identity!
        // Author identity and role are derived strictly and exclusively from authenticated req.user
        const authorId = req.user._id;
        const authorName = req.user.name || 'User';
        const authorRole = normalizeRole(req.user.role); // strictly canonical lowercase from JWT
        const statusChange = req.body.statusChange || null;

        const updateEntry = await GrievanceUpdate.create({
            grievanceId,
            authorId,
            authorName,
            authorRole,
            message,
            userId: authorId,
            notes: message,
            type: formatRoleLabel(authorRole),
            statusChange
        });

        // Optionally update grievance status if statusChange provided
        if (statusChange && statusChange !== grievance.status) {
            grievance.status = statusChange;
            if (statusChange === 'Resolved') {
                grievance.resolvedAt = Date.now();
            }
            await grievance.save();
        }

        await logAudit(req.user._id, 'Add Grievance Update', `Added ${formatRoleLabel(authorRole)} update to grievance "${grievance.title}".`);

        res.status(201).json({
            _id: updateEntry._id,
            grievanceId: updateEntry.grievanceId,
            authorId: updateEntry.authorId,
            authorName: updateEntry.authorName,
            authorRole: updateEntry.authorRole,
            message: updateEntry.message,
            createdAt: updateEntry.createdAt,
            userId: updateEntry.userId,
            type: updateEntry.type,
            notes: updateEntry.notes,
            statusChange: updateEntry.statusChange
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getUpdatesByGrievance,
    createUpdate
};
