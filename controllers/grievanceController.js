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
            const role = req.user.role;
            
            if (role === 'citizen') {
                let citizenDoc = await Citizen.findOne({ linkedUserId: req.user._id });
                if (!citizenDoc && req.user.linkedCitizenId) {
                    citizenDoc = await Citizen.findById(req.user.linkedCitizenId);
                }
                if (citizenDoc) {
                    query.citizenId = citizenDoc._id;
                } else {
                    return res.status(200).json([]);
                }
            } else if (role === 'officer' || role === 'field_officer') {
                query.assignedTo = req.user._id;
            } else if (role === 'manager') {
                if (req.user.scope && req.user.scope !== 'All') {
                    query.category = req.user.scope;
                }
            }
        }

        if (citizenId) query.citizenId = citizenId;
        if (status) query.status = status;
        if (priority) query.priority = priority;

        // If manager attempts to explicitly query a category outside their scope, reject or enforce scope
        if (category) {
            if (req.user && req.user.role === 'manager' && req.user.scope && req.user.scope !== 'All' && category !== req.user.scope) {
                return res.status(403).json({ message: `Access denied: Your manager scope is restricted to ${req.user.scope}` });
            }
            query.category = category;
        }

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
            .populate('assignedTo', 'name email role scope')
            .sort('-createdAt');

        res.status(200).json(grievances);
    } catch (error) {
        console.error('getGrievances error:', error);
        res.status(500).json({ message: error.message });
    }
};

const getGrievanceById = async (req, res) => {
    try {
        const grievance = await Grievance.findById(req.params.id)
            .populate('citizenId', 'name email contact address escalationRisk')
            .populate('assignedTo', 'name email role scope');

        if (!grievance) {
            return res.status(404).json({ message: 'Grievance not found' });
        }

        // Server-side Scope & Role Check
        if (req.user) {
            const role = req.user.role;
            if (role === 'citizen') {
                const citizenDoc = await Citizen.findOne({ linkedUserId: req.user._id });
                if (!citizenDoc || String(grievance.citizenId?._id || grievance.citizenId) !== String(citizenDoc._id)) {
                    return res.status(403).json({ message: 'Access forbidden: You can only view your own submitted grievances' });
                }
            } else if (role === 'officer' || role === 'field_officer') {
                if (!grievance.assignedTo || String(grievance.assignedTo._id || grievance.assignedTo) !== String(req.user._id)) {
                    return res.status(403).json({ message: 'Access forbidden: Grievance is not assigned to you' });
                }
            } else if (role === 'manager') {
                if (req.user.scope && req.user.scope !== 'All' && grievance.category !== req.user.scope) {
                    return res.status(403).json({ message: `Access forbidden: Grievance category (${grievance.category}) is outside your manager scope (${req.user.scope})` });
                }
            }
        }

        res.status(200).json(grievance);
    } catch (error) {
        console.error('getGrievanceById error:', error);
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
                    contact: req.user.phone || '',
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
        console.error('createGrievance error:', error);
        res.status(500).json({ message: error.message });
    }
};

const updateGrievance = async (req, res) => {
    try {
        const grievance = await Grievance.findById(req.params.id);
        if (!grievance) {
            return res.status(404).json({ message: 'Grievance not found' });
        }

        // Server-side Scope & Role Check for Updates
        if (req.user) {
            const role = req.user.role;
            if (role === 'officer' || role === 'field_officer') {
                if (!grievance.assignedTo || String(grievance.assignedTo) !== String(req.user._id)) {
                    return res.status(403).json({ message: 'Access forbidden: You can only update grievances assigned to you' });
                }
            } else if (role === 'manager') {
                if (req.user.scope && req.user.scope !== 'All' && grievance.category !== req.user.scope) {
                    return res.status(403).json({ message: `Access forbidden: Grievance category (${grievance.category}) is outside your manager scope (${req.user.scope})` });
                }
            } else if (role === 'citizen') {
                return res.status(403).json({ message: 'Citizens cannot directly update grievance administrative metadata' });
            }
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
         .populate('assignedTo', 'name email role scope');

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
        console.error('updateGrievance error:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * Task 4: Explainable Heuristic SLA Escalation Risk Engine
 * Inputs:
 * - Ticket Priority (Critical=40, High=30, Medium=15, Low=5)
 * - SLA Overdue Hours (Hours past deadline * 2)
 * - Category Weighting (Water Supply/Sanitation/Public Safety = 10, others = 0)
 * - Citizen Unresolved Complaints Count (* 5)
 *
 * Scoring Output:
 * - Total Score >= 60 -> 'Critical' (Urgent supervisor intervention & officer dispatch)
 * - Total Score 35-59 -> 'High' (Imminent SLA breach)
 * - Total Score 15-34 -> 'Medium' (Moderate delay/inactivity)
 * - Total Score < 15  -> 'Low' (Normal operational window)
 */
const generateInsights = async (req, res) => {
    try {
        const citizens = await Citizen.find();
        const insights = [];

        for (const citizen of citizens) {
            const citizenGrievances = await Grievance.find({
                citizenId: citizen._id,
                status: { $ne: 'Resolved' }
            });

            const openCount = citizenGrievances.length;
            let highestCalculatedScore = 0;
            let riskFactors = [];
            let dominantCategory = '';

            for (const g of citizenGrievances) {
                let priorityWeight = 5;
                if (g.priority === 'Critical') priorityWeight = 40;
                else if (g.priority === 'High') priorityWeight = 30;
                else if (g.priority === 'Medium') priorityWeight = 15;

                let categoryWeight = 0;
                if (['Water Supply', 'Sanitation', 'Public Safety'].includes(g.category)) {
                    categoryWeight = 10;
                }

                let slaOverdueHours = 0;
                const now = new Date();
                if (g.deadline && now > new Date(g.deadline)) {
                    slaOverdueHours = Math.floor((now - new Date(g.deadline)) / (1000 * 60 * 60));
                }

                // Explicit Heuristic Formula
                const ticketScore = priorityWeight + (slaOverdueHours * 2) + categoryWeight + (openCount * 5);
                if (ticketScore > highestCalculatedScore) {
                    highestCalculatedScore = ticketScore;
                    dominantCategory = g.category;
                }

                if (g.priority === 'Critical') {
                    riskFactors.push(`Critical Priority Ticket: ${g.title}`);
                }
                if (slaOverdueHours > 0) {
                    riskFactors.push(`SLA Breached by ${slaOverdueHours}h: ${g.title}`);
                }
            }

            if (openCount >= 3) {
                riskFactors.push(`Multiple Active Complaints (${openCount})`);
            }

            let riskLabel = 'Low';
            let recommendation = 'Grievance filings are within normal SLA thresholds. Standard resolution workflow active.';

            if (highestCalculatedScore >= 60) {
                riskLabel = 'Critical';
                recommendation = `CRITICAL ESCALATION (Score: ${highestCalculatedScore}): SLA breach or high-priority risk in ${dominantCategory || 'service area'}. Urgent officer dispatch & supervisor intervention required.`;
            } else if (highestCalculatedScore >= 35) {
                riskLabel = 'High';
                recommendation = `HIGH RISK (Score: ${highestCalculatedScore}): SLA deadline imminent or breached. Assign senior field officer to expedite response.`;
            } else if (highestCalculatedScore >= 15 || openCount >= 1) {
                riskLabel = 'Medium';
                recommendation = `MODERATE RISK (Score: ${highestCalculatedScore}): Active complaint pending resolution. Monitor field progress.`;
            } else {
                riskFactors.push('No Active SLA Breaches');
            }

            citizen.escalationRisk = riskLabel === 'Critical' ? 'High' : riskLabel;
            await citizen.save();

            let insight = await Insight.findOne({ citizenId: citizen._id });
            if (insight) {
                insight.riskScore = riskLabel;
                insight.recommendation = recommendation;
                insight.riskFactors = riskFactors;
                insight.generatedAt = Date.now();
                await insight.save();
            } else {
                insight = await Insight.create({
                    citizenId: citizen._id,
                    riskScore: riskLabel,
                    recommendation,
                    riskFactors
                });
            }
            insights.push(insight);
        }

        await logAudit(req.user._id, 'Run Escalation Risk Engine', 'Executed Heuristic SLA Escalation Risk Engine across citizen accounts.');

        res.status(200).json(insights);
    } catch (error) {
        console.error('generateInsights error:', error);
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
