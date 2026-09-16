const Grievance = require('../models/Grievance');
const Citizen = require('../models/Citizen');
const Insight = require('../models/Insight');
const GrievanceUpdate = require('../models/GrievanceUpdate');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const auditController = require('./auditController');
const identityHelper = require('../utils/identityHelper');
const imageProcessor = require('../utils/imageProcessor');
const storageService = require('../utils/storageService');

const getGrievances = async (req, res) => {
    try {
        const { startDate, endDate, status, priority, category, citizenId } = req.query;
        let query = {};

        if (req.user) {
            const role = req.user.role;
            
            if (role === 'citizen') {
                const associatedIds = await identityHelper.getAllAssociatedIds(req.user._id);
                if (associatedIds.length > 0) {
                    query.citizenId = { $in: associatedIds };
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

        if (citizenId) {
            if (req.user && req.user.role === 'citizen') {
                const myAssociatedIds = await identityHelper.getAllAssociatedIds(req.user._id);
                if (!myAssociatedIds.includes(String(citizenId))) {
                    return res.status(403).json({ message: 'Access forbidden: You cannot query other citizens grievances' });
                }
            }
            const targetIds = await identityHelper.getAllAssociatedIds(citizenId);
            if (targetIds.length > 0) {
                query.citizenId = { $in: targetIds };
            } else {
                query.citizenId = citizenId;
            }
        }
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
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (!req.params.id || typeof req.params.id !== 'string' || req.params.id.trim() === '') {
            return res.status(404).json({ message: 'Grievance not found' });
        }

        const grievance = await Grievance.findById(req.params.id)
            .populate('citizenId', 'name email contact address escalationRisk')
            .populate('assignedTo', 'name email role scope');

        if (!grievance) {
            return res.status(404).json({ message: 'Grievance not found' });
        }

        // Server-side Scope & Role Check
        const role = req.user.role;
        if (role === 'citizen') {
            const associatedIds = await identityHelper.getAllAssociatedIds(req.user._id);
            const grievanceCitizenIdStr = String(grievance.citizenId?._id || grievance.citizenId);
            if (!associatedIds.includes(grievanceCitizenIdStr)) {
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
        } else if (role === 'admin') {
            // admin has full access
        } else {
            return res.status(403).json({ message: `Access forbidden: Role ${role} is not authorized` });
        }

        res.status(200).json(grievance);
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(404).json({ message: 'Grievance not found' });
        }
        console.error('getGrievanceById error:', error);
        res.status(500).json({ message: error.message });
    }
};

const getGrievancePhoto = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (!req.params.id || typeof req.params.id !== 'string' || req.params.id.trim() === '') {
            return res.status(404).json({ message: 'Grievance not found' });
        }

        const grievance = await Grievance.findById(req.params.id);

        if (!grievance) {
            return res.status(404).json({ message: 'Grievance not found' });
        }

        // Server-side Scope & Role Authorization
        const role = req.user.role;
        if (role === 'citizen') {
            const associatedIds = await identityHelper.getAllAssociatedIds(req.user._id);
            const grievanceCitizenIdStr = String(grievance.citizenId?._id || grievance.citizenId);
            if (!associatedIds.includes(grievanceCitizenIdStr)) {
                return res.status(403).json({ message: 'Access forbidden: You can only view photos of your own submitted grievances' });
            }
        } else if (role === 'officer' || role === 'field_officer') {
            if (!grievance.assignedTo || String(grievance.assignedTo._id || grievance.assignedTo) !== String(req.user._id)) {
                return res.status(403).json({ message: 'Access forbidden: Grievance is not assigned to you' });
            }
        } else if (role === 'manager') {
            if (req.user.scope && req.user.scope !== 'All' && grievance.category !== req.user.scope) {
                return res.status(403).json({ message: `Access forbidden: Grievance category (${grievance.category}) is outside your manager scope (${req.user.scope})` });
            }
        } else if (role === 'admin') {
            // admin has full access
        } else {
            return res.status(403).json({ message: `Access forbidden: Role ${role} is not authorized` });
        }

        // Verify that this grievance actually has an evidence photo attachment
        if (!grievance.attachment || !grievance.attachment.storageKey) {
            return res.status(404).json({ message: 'No photographic evidence attached to this grievance' });
        }

        // Verify that object storage service is configured
        if (!storageService.isStorageConfigured()) {
            return res.status(503).json({ message: 'Object storage service is temporarily unavailable' });
        }

        // Generate temporary presigned GET URL from the server-persisted storageKey
        const { url, expiresIn } = await storageService.generatePresignedGetUrl(grievance.attachment.storageKey);

        res.status(200).json({
            photoUrl: url,
            expiresIn,
            attachment: {
                originalName: grievance.attachment.originalName || 'evidence.jpg',
                mimeType: grievance.attachment.mimeType || 'image/jpeg',
                size: grievance.attachment.size,
                dimensions: grievance.attachment.dimensions,
                uploadedAt: grievance.attachment.uploadedAt
            }
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(404).json({ message: 'Grievance not found' });
        }
        console.error('getGrievancePhoto error:', error.message);
        res.status(500).json({ message: 'Evidence photo currently unavailable' });
    }
};

const createGrievance = async (req, res) => {
    let uploadedStorageKey = null;
    let resolvedCitizenId = null;
    try {
        let { citizenId, title, description, category, location, priority, citizenName, assignedTo, idempotencyKey } = req.body;

        if (!title || !description || !category || !location) {
            return res.status(400).json({ message: 'Please provide title, description, category, and location' });
        }

        // Validate and sanitize idempotencyKey format immediately at request intake
        if (idempotencyKey) {
            if (typeof idempotencyKey !== 'string' || idempotencyKey.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(idempotencyKey)) {
                return res.status(400).json({ message: 'Invalid idempotencyKey format. Must be an alphanumeric string up to 128 characters.' });
            }
        }

        let citizenDoc = null;
        if (req.user && req.user.role === 'citizen') {
            citizenDoc = await identityHelper.getCanonicalCitizen({
                userId: req.user._id,
                email: req.user.email,
                name: req.user.name,
                phone: req.user.phone
            });
        } else if (citizenId) {
            citizenDoc = await identityHelper.getCanonicalCitizen({
                citizenId,
                name: citizenName
            });
        }

        if (!citizenDoc) {
            return res.status(400).json({ message: 'Citizen reference is required' });
        }

        citizenId = citizenDoc._id;
        resolvedCitizenId = citizenDoc._id;
        citizenName = citizenDoc.name;

        // Idempotency check: if already submitted, return existing record
        if (idempotencyKey) {
            const existing = await Grievance.findOne({ citizenId, idempotencyKey });
            if (existing) {
                return res.status(200).json(existing);
            }
        }

        // Handle optional photo upload if present
        let attachmentData = null;
        if (req.file) {
            if (process.env.PHOTO_UPLOAD_ENABLED !== 'true') {
                return res.status(400).json({ message: 'Photographic evidence uploads are currently disabled' });
            }

            if (!storageService.isStorageConfigured()) {
                return res.status(503).json({ message: 'Object storage service is temporarily unavailable' });
            }

            const processed = await imageProcessor.validateAndProcessImage(req.file.buffer);
            const storageKey = storageService.generateStorageKey();

            await storageService.uploadToR2(storageKey, processed.buffer, processed.mimeType);
            uploadedStorageKey = storageKey;

            attachmentData = {
                storageKey,
                originalName: req.file.originalname || 'photo.jpg',
                mimeType: processed.mimeType,
                size: processed.size,
                dimensions: processed.dimensions,
                checksum: processed.checksum,
                uploadedAt: new Date()
            };
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
            citizenEmail: citizenDoc.email || '',
            title,
            description,
            category,
            location,
            priority: prio,
            status: 'Open',
            assignedTo: assignedTo || null,
            officerName,
            deadline,
            idempotencyKey: idempotencyKey || undefined,
            attachment: attachmentData || undefined
        });

        // Update citizen activity
        if (citizenDoc.save) {
            citizenDoc.lastActivity = Date.now();
            await citizenDoc.save();
        }

        // Create initial update timeline entry
        await GrievanceUpdate.create({
            grievanceId: grievance._id,
            userId: req.user ? req.user._id : citizenId,
            type: 'Citizen Response',
            notes: `Grievance submitted under ${category} at ${location}. Priority set to ${prio}.${attachmentData ? ' Photographic evidence attached.' : ''}`,
            statusChange: 'Open'
        });

        await auditController.logAudit(req.user ? req.user._id : citizenId, 'Create Grievance', `Created grievance "${title}" for citizen ${citizenName}.`);

        res.status(201).json(grievance);
    } catch (error) {
        // Compensating transaction: purge R2 object if database save failed
        if (uploadedStorageKey) {
            try {
                await storageService.deleteFromR2(uploadedStorageKey);
                console.warn(`[Compensating Transaction] Purged orphaned R2 asset: ${uploadedStorageKey}`);
            } catch (cleanupErr) {
                console.error(`[CRITICAL] Failed to purge orphaned R2 asset ${uploadedStorageKey}: ${cleanupErr.message}`);
                console.error(`[ORPHAN_RECONCILIATION_REQUIRED] ${JSON.stringify({
                    storageKey: uploadedStorageKey,
                    citizenId: resolvedCitizenId || req.body?.citizenId || null,
                    timestamp: new Date().toISOString(),
                    error: cleanupErr.message
                })}`);
            }
        }

        // Handle duplicate key error on idempotencyKey gracefully
        if (error.code === 11000 && req.body && req.body.idempotencyKey) {
            try {
                const targetCitizenId = resolvedCitizenId || req.body.citizenId;
                if (targetCitizenId) {
                    const existing = await Grievance.findOne({ citizenId: targetCitizenId, idempotencyKey: req.body.idempotencyKey });
                    if (existing) return res.status(200).json(existing);
                }
            } catch (findErr) {
                console.error('Failed to query existing idempotent grievance:', findErr.message);
            }
        }

        console.error('createGrievance error:', error);
        if (error.name === 'ValidationError' || error.code === 'MALFORMED_IMAGE' || error.code === 'FILE_TOO_LARGE' || error.code === 'PIXEL_LIMIT_EXCEEDED' || error.code === 'UNSUPPORTED_FORMAT') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Failed to submit grievance. Please try again.' });
    }
};

const updateGrievance = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (!req.params.id || typeof req.params.id !== 'string' || req.params.id.trim() === '') {
            return res.status(404).json({ message: 'Grievance not found' });
        }

        const grievance = await Grievance.findById(req.params.id);
        if (!grievance) {
            return res.status(404).json({ message: 'Grievance not found' });
        }

        // Server-side Scope & Role Check for Updates
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
        } else if (role === 'admin') {
            // admin authorized
        } else {
            return res.status(403).json({ message: `Access forbidden: Role ${role} is not authorized` });
        }

        const oldStatus = grievance.status;
        const rawBody = req.body || {};
        const updateData = {};

        // Immutable security boundary: prevent modifying evidence attachment, idempotencyKey, or citizen ownership via PUT
        const IMMUTABLE_ROOTS = ['attachment', 'idempotencyKey', 'citizenId', 'citizenEmail', 'citizenName', '_id', 'createdAt', 'updatedAt'];

        for (const [key, value] of Object.entries(rawBody)) {
            // Strip top-level Mongo operators like $unset, $rename, etc.
            if (key.startsWith('$')) {
                if (key === '$set' && value && typeof value === 'object') {
                    for (const [subKey, subVal] of Object.entries(value)) {
                        const isForbidden = IMMUTABLE_ROOTS.some(root => subKey === root || subKey.startsWith(root + '.'));
                        if (!isForbidden) {
                            updateData[subKey] = subVal;
                        }
                    }
                }
                continue;
            }

            const isForbidden = IMMUTABLE_ROOTS.some(root => key === root || key.startsWith(root + '.'));
            if (!isForbidden) {
                updateData[key] = value;
            }
        }

        let assignedOfficerObj = null;
        if (updateData.assignedTo && updateData.assignedTo !== String(grievance.assignedTo)) {
            const officer = await User.findById(updateData.assignedTo);
            if (!officer || !['officer', 'field_officer'].includes(officer.role)) {
                return res.status(400).json({ message: 'Invalid assignment: Selected user is not an active Field Officer' });
            }
            updateData.officerName = officer.name;
            assignedOfficerObj = officer;
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

        if (assignedOfficerObj) {
            await GrievanceUpdate.create({
                grievanceId: grievance._id,
                userId: req.user._id,
                type: 'Officer Field Note',
                notes: `Assigned to field officer ${assignedOfficerObj.name}.`,
                statusChange: updatedGrievance.status
            });

            await auditController.logAudit(req.user._id, 'Assign Officer', `Assigned grievance "${grievance.title}" to officer ${assignedOfficerObj.name}.`);
        }

        if (updateData.status && updateData.status !== oldStatus) {
            await GrievanceUpdate.create({
                grievanceId: grievance._id,
                userId: req.user._id,
                type: 'Status Update',
                notes: `Status updated from ${oldStatus} to ${updateData.status}.`,
                statusChange: updateData.status
            });

            await auditController.logAudit(req.user._id, 'Update Grievance', `Changed grievance "${grievance.title}" status from ${oldStatus} to ${updateData.status}.`);

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
        if (error.name === 'CastError') {
            return res.status(404).json({ message: 'Grievance not found' });
        }
        console.error('updateGrievance error:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
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
    getGrievancePhoto,
    createGrievance,
    updateGrievance,
    generateInsights,
    getInsights
};
