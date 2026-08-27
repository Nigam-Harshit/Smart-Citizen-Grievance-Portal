const Grievance = require('../models/Grievance');
const Citizen = require('../models/Citizen');
const Insight = require('../models/Insight');
const GrievanceUpdate = require('../models/GrievanceUpdate');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const { logAudit } = require('./auditController');

const getGrievances = async (req, res) => {
    try {
        const { startDate, endDate, status, priority, category, citizenId } = req.query;
        let query = {};

        if (req.user) {
            if (req.user.role === 'citizen') {
                let citizenDoc = await Citizen.findOne({ linkedUserId: req.user._id });
                if (!citizenDoc && req.user.linkedCitizenId) {
                    citizenDoc = await Citizen.findById(req.user.linkedCitizenId);
                }
                if (citizenDoc) {
                    query.citizenId = citizenDoc._id;
                } else {
                    return res.status(200).json([]);
                }
            } else if (req.user.role === 'officer') {
                query.assignedTo = req.user._id;
            }
        }

        if (citizenId) query.citizenId = citizenId;
        if (status) query.status = status;
        if (priority) query.priority = priority;
        if (category) query.category = category;

        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        } else if (startDate) {
            query.createdAt = { $gte: new Date(startDate) };
        } else if (endDate) {
            query.createdAt = { $lte: new Date(endDate) };
        }

        const grievances = await Grievance.find(query)
            .populate('citizenId', 'name email contact address escalationRisk')
            .populate('assignedTo', 'name email role')
            .sort('-createdAt');

        res.status(200).json(grievances);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getGrievanceById = async (req, res) => {
    try {
        const grievance = await Grievance.findById(req.params.id)
            .populate('citizenId', 'name email contact address escalationRisk')
            .populate('assignedTo', 'name email role');

        if (!grievance) {
            return res.status(404).json({ message: 'Grievance not found' });
        }

        res.status(200).json(grievance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createGrievance = async (req, res) => {
    try {
        let { citizenId, title, description, category, location, priority, citizenName, assignedTo } = req.body;

        if (!title || !description || !category || !location) {
            return res.status(400).json({ message: 'Please provide title, description, category, and location' });
        }

        // Auto resolve citizen profile if user is a logged-in citizen
        if (req.user && req.user.role === 'citizen') {
            let citizenDoc = await Citizen.findOne({ linkedUserId: req.user._id });
            if (!citizenDoc && req.user.linkedCitizenId) {
                citizenDoc = await Citizen.findById(req.user.linkedCitizenId);
            }

            if (!citizenDoc) {
                citizenDoc = await Citizen.create({
                    name: req.user.name,
                    email: req.user.email,
                    contact: req.user.phone || 'N/A',
                    linkedUserId: req.user._id
                });
                req.user.linkedCitizenId = citizenDoc._id;
                await req.user.save();
            }

            citizenId = citizenDoc._id;
            citizenName = citizenDoc.name;
        }

        if (!citizenId) {
            return res.status(400).json({ message: 'Citizen reference is required' });
        }

        const citizenDoc = await Citizen.findById(citizenId);
        if (citizenDoc) {
            citizenName = citizenDoc.name;
        }

        // Calculate SLA deadline based on priority
        const now = new Date();
        let deadline = new Date();
        const prio = priority || 'Medium';

        if (prio === 'Critical') {
            deadline.setHours(now.getHours() + 24); // 24 hours
        } else if (prio === 'High') {
            deadline.setDate(now.getDate() + 3); // 3 days
        } else if (prio === 'Medium') {
            deadline.setDate(now.getDate() + 7); // 7 days
        } else { // Low
            deadline.setDate(now.getDate() + 14); // 14 days
        }

        // Assign default officer if assignedTo specified or leave for assignment
        let officerName = '';
        if (assignedTo) {
            const officer = await User.findById(assignedTo);
            if (officer) officerName = officer.name;
        }

        const grievance = await Grievance.create({
            citizenId,
            citizenName,
            title,
            description,
            category,
            location,
            priority: prio,
            status: 'Open',
            assignedTo: assignedTo || null,
            officerName,
            deadline
        });

        // Update citizen activity
        if (citizenDoc) {
            citizenDoc.lastActivity = Date.now();
            await citizenDoc.save();
        }

        // Create initial update timeline entry
        await GrievanceUpdate.create({
            grievanceId: grievance._id,
            userId: req.user ? req.user._id : citizenId,
            type: 'Citizen Response',
            notes: `Grievance submitted under ${category} at ${location}. Priority set to ${prio}.`,
            statusChange: 'Open'
        });

        await logAudit(req.user._id, 'Create Grievance', `Created grievance "${title}" for citizen ${citizenName}.`);

        res.status(201).json(grievance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateGrievance = async (req, res) => {
    try {
        const grievance = await Grievance.findById(req.params.id);
        if (!grievance) {
            return res.status(404).json({ message: 'Grievance not found' });
        }

        const oldStatus = grievance.status;
        const updateData = { ...req.body };

        if (updateData.assignedTo && updateData.assignedTo !== String(grievance.assignedTo)) {
            const officer = await User.findById(updateData.assignedTo);
            if (officer) updateData.officerName = officer.name;
        }

        if (updateData.status === 'Resolved' && oldStatus !== 'Resolved') {
            updateData.resolvedAt = Date.now();
        }

        const updatedGrievance = await Grievance.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate('citizenId', 'name email contact address')
         .populate('assignedTo', 'name email role');

        if (updateData.status && updateData.status !== oldStatus) {
            await GrievanceUpdate.create({
                grievanceId: grievance._id,
                userId: req.user._id,
                type: 'Status Update',
                notes: `Status updated from ${oldStatus} to ${updateData.status}.`,
                statusChange: updateData.status
            });

            await logAudit(req.user._id, 'Update Grievance', `Changed grievance "${grievance.title}" status from ${oldStatus} to ${updateData.status}.`);

            // Email alert simulation/sending
            const citizen = await Citizen.findById(grievance.citizenId);
            if (citizen && citizen.email) {
                const message = `Dear ${citizen.name},\n\nYour grievance titled "${grievance.title}" (ID: ${grievance._id}) status has been updated to: ${updateData.status}.\n\nThank you for using the Smart Citizen Grievance Portal.`;
                try {
                    await sendEmail({
                        email: citizen.email,
                        subject: `Grievance Status Update: [${updateData.status}] ${grievance.title}`,
                        message
                    });
                } catch (emailErr) {
                    console.log('Email send error handled:', emailErr.message);
                }
            }
        }

        res.status(200).json(updatedGrievance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const generateInsights = async (req, res) => {
    try {
        const citizens = await Citizen.find();
        const insights = [];

        for (const citizen of citizens) {
            const openGrievances = await Grievance.countDocuments({
                citizenId: citizen._id,
                status: { $ne: 'Resolved' }
            });

            const criticalGrievances = await Grievance.countDocuments({
                citizenId: citizen._id,
                priority: 'Critical',
                status: { $ne: 'Resolved' }
            });

            const overdueGrievances = await Grievance.countDocuments({
                citizenId: citizen._id,
                status: { $ne: 'Resolved' },
                deadline: { $lt: new Date() }
            });

            const lastActivityDate = citizen.lastActivity ? new Date(citizen.lastActivity) : new Date();
            const daysInactive = Math.floor((Date.now() - lastActivityDate) / (1000 * 60 * 60 * 24));

            let riskScore = 'Low';
            let recommendation = 'Grievance filings are within normal thresholds. Standard resolution workflow active.';
            let riskFactors = [];

            if (criticalGrievances >= 1 || overdueGrievances >= 1) {
                riskScore = 'High';
                let reasons = [];
                if (criticalGrievances > 0) {
                    reasons.push(`${criticalGrievances} Critical issue(s) unresolved`);
                    riskFactors.push(`${criticalGrievances} Unresolved Critical Grievance(s)`);
                }
                if (overdueGrievances > 0) {
                    reasons.push(`${overdueGrievances} SLA Breached / Overdue Grievance(s)`);
                    riskFactors.push(`${overdueGrievances} Overdue SLA Breaches`);
                }
                recommendation = `URGENT ESCALATION: ${reasons.join(' and ')}. Immediate officer dispatch and supervisor intervention required.`;
            } else if (openGrievances >= 3) {
                riskScore = 'High';
                riskFactors.push(`Multiple Open Complaints: ${openGrievances}`);
                recommendation = `High Escalation Risk due to ${openGrievances} active open complaints. Assign a senior officer to consolidate response.`;
            } else if (daysInactive > 14 || openGrievances >= 1) {
                riskScore = 'Medium';
                if (daysInactive > 14) {
                    riskFactors.push(`Inactivity: No updates for ${daysInactive} days`);
                    recommendation = `Pending grievance requires follow-up. Citizen inactive for ${daysInactive} days.`;
                } else {
                    riskFactors.push(`${openGrievances} Active Grievance pending resolution`);
                    recommendation = `Monitor resolution progress. ${openGrievances} grievance pending.`;
                }
            } else {
                riskFactors.push('No Critical Issues');
                riskFactors.push('Standard Resolution Timeline');
            }

            citizen.escalationRisk = riskScore;
            await citizen.save();

            let insight = await Insight.findOne({ citizenId: citizen._id });
            if (insight) {
                insight.riskScore = riskScore;
                insight.recommendation = recommendation;
                insight.riskFactors = riskFactors;
                insight.generatedAt = Date.now();
                await insight.save();
            } else {
                insight = await Insight.create({
                    citizenId: citizen._id,
                    riskScore,
                    recommendation,
                    riskFactors
                });
            }
            insights.push(insight);
        }

        await logAudit(req.user._id, 'Run Escalation Risk Model', 'Executed AI Escalation Risk model across all citizen accounts.');

        res.status(200).json(insights);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getInsights = async (req, res) => {
    try {
        const insights = await Insight.find().populate('citizenId', 'name email contact address status escalationRisk');
        res.status(200).json(insights);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getGrievances,
    getGrievanceById,
    createGrievance,
    updateGrievance,
    generateInsights,
    getInsights
};
