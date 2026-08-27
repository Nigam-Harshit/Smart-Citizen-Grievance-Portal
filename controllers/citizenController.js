const Citizen = require('../models/Citizen');
const Grievance = require('../models/Grievance');
const Insight = require('../models/Insight');
const GrievanceUpdate = require('../models/GrievanceUpdate');
const { logAudit } = require('./auditController');

const getCitizens = async (req, res) => {
    try {
        let query = {};
        if (req.user) {
            if (req.user.role === 'citizen') {
                query.$or = [
                    { linkedUserId: req.user._id },
                    { _id: req.user.linkedCitizenId }
                ];
            } else if (req.user.role === 'officer') {
                query.assignedTo = req.user._id;
            }
        }
        const citizens = await Citizen.find(query).populate('assignedTo', 'name email role').sort('-createdAt');
        res.status(200).json(citizens);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getCitizenById = async (req, res) => {
    try {
        const citizen = await Citizen.findById(req.params.id).populate('assignedTo', 'name email role');
        if (!citizen) return res.status(404).json({ message: 'Citizen profile not found' });

        // Access check
        if (req.user.role === 'citizen' && String(citizen.linkedUserId) !== String(req.user._id) && String(citizen._id) !== String(req.user.linkedCitizenId)) {
            return res.status(403).json({ message: 'Access denied to this citizen profile' });
        }

        res.status(200).json(citizen);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createCitizen = async (req, res) => {
    try {
        const { name, email, contact, address, status, assignedTo } = req.body;

        if (!name || !email || !contact) {
            return res.status(400).json({ message: 'Please add all required fields (name, email, contact)' });
        }

        const citizenExists = await Citizen.findOne({ email });
        if (citizenExists) {
            return res.status(400).json({ message: 'Citizen with this email already exists' });
        }

        const citizen = await Citizen.create({
            name,
            email,
            contact,
            address: address || '',
            status: status || 'Active',
            assignedTo: assignedTo || req.user._id
        });

        await logAudit(req.user._id, 'Create Citizen', `Created a new citizen record for ${name}.`);
        res.status(201).json(citizen);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateCitizen = async (req, res) => {
    try {
        const citizen = await Citizen.findById(req.params.id);

        if (!citizen) {
            return res.status(404).json({ message: 'Citizen not found' });
        }

        const updatedCitizen = await Citizen.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('assignedTo', 'name email role');

        await logAudit(req.user._id, 'Update Citizen', `Updated profile details for citizen ${updatedCitizen.name}.`);
        res.status(200).json(updatedCitizen);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteCitizen = async (req, res) => {
    try {
        const citizen = await Citizen.findById(req.params.id);

        if (!citizen) {
            return res.status(404).json({ message: 'Citizen not found' });
        }

        // Cascade delete: Remove all grievances, updates, and insights for this citizen
        const grievances = await Grievance.find({ citizenId: citizen._id });
        const grievanceIds = grievances.map(g => g._id);

        await GrievanceUpdate.deleteMany({ grievanceId: { $in: grievanceIds } });
        await Grievance.deleteMany({ citizenId: citizen._id });
        await Insight.deleteMany({ citizenId: citizen._id });
        await citizen.deleteOne();

        await logAudit(req.user._id, 'Delete Citizen', `Deleted citizen profile: ${citizen.name}. Associated grievances and insights removed.`);

        res.status(200).json({ id: req.params.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getCitizens,
    getCitizenById,
    createCitizen,
    updateCitizen,
    deleteCitizen
};
