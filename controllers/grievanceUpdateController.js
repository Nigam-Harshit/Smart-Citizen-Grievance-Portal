const GrievanceUpdate = require('../models/GrievanceUpdate');
const Grievance = require('../models/Grievance');
const { logAudit } = require('./auditController');

const getUpdatesByGrievance = async (req, res) => {
    try {
        const updates = await GrievanceUpdate.find({ grievanceId: req.params.grievanceId })
            .populate('userId', 'name role email')
            .sort('-createdAt');

        res.status(200).json(updates);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createUpdate = async (req, res) => {
    try {
        const { type, notes, statusChange } = req.body;
        const grievanceId = req.params.grievanceId;

        const grievance = await Grievance.findById(grievanceId);
        if (!grievance) {
            return res.status(404).json({ message: 'Grievance not found' });
        }

        if (!type || !notes) {
            return res.status(400).json({ message: 'Please provide type and notes' });
        }

        const updateEntry = await GrievanceUpdate.create({
            grievanceId,
            userId: req.user._id,
            type,
            notes,
            statusChange: statusChange || null
        });

        // Optionally update grievance status if statusChange provided
        if (statusChange && statusChange !== grievance.status) {
            grievance.status = statusChange;
            if (statusChange === 'Resolved') {
                grievance.resolvedAt = Date.now();
            }
            await grievance.save();
        }

        await logAudit(req.user._id, 'Add Grievance Update', `Added ${type} update to grievance "${grievance.title}".`);

        res.status(201).json(updateEntry);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getUpdatesByGrievance,
    createUpdate
};
