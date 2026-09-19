const mongoose = require('mongoose');
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
const costGovernorService = require('../services/costGovernorService');
const { normalizeRole, formatRoleLabel } = require('../utils/roleHelper');
const { createNotificationSafe } = require('./notificationController');

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

        const id = req.params.id ? String(req.params.id).trim() : '';
        if (!id) {
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

        const id = req.params.id ? String(req.params.id).trim() : '';
        if (!id) {
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

        // Record photo access telemetry for cost governor
        costGovernorService.recordPhotoAccessRequest().catch(() => {});

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
    let storageReservation = null;
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

            // Layer 4 & 5: Cost Governor Safety Net Check & Pre-processing Quota Reservation
            const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
            const estimatedBytes = req.file.size || 2 * 1024 * 1024;
            const reservation = await costGovernorService.reserveUploadQuota({
                citizenId: resolvedCitizenId || citizenId,
                ip: clientIp,
                estimatedBytes
            });

            if (!reservation.allowed) {
                return res.status(503).json({
                    code: reservation.code || 'PHOTO_STORAGE_SAFE_MODE',
                    message: reservation.message || 'Photographic evidence uploads are temporarily unavailable due to safety limits. You may still lodge a grievance without a photo.'
                });
            }
            storageReservation = reservation;

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
                provider: storageService.getStorageProvider() || 's3',
                uploadedAt: new Date()
            };
        }

        // Calculate expected resolution deadline based on priority
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

        // Commit storage reservation if photo was uploaded
        if (storageReservation && attachmentData) {
            await costGovernorService.commitReservation({
                period: storageReservation.period,
                estimatedBytes: storageReservation.estimatedBytes,
                actualBytes: attachmentData.size,
                citizenId: resolvedCitizenId || citizenId,
                ip: req.ip || req.connection?.remoteAddress || 'unknown'
            });
        }

        // Update citizen activity
        if (citizenDoc.save) {
            citizenDoc.lastActivity = Date.now();
            await citizenDoc.save();
        }

        // Create initial update timeline entry
        // Create initial update timeline entry with canonical author fields
        const authorId = req.user ? req.user._id : citizenId;
        const authorName = req.user ? req.user.name : citizenName;
        const authorRole = req.user ? normalizeRole(req.user.role) : 'citizen';
        const initialNote = `Grievance submitted under ${category} at ${location}. Priority set to ${prio}.${attachmentData ? ' Photographic evidence attached.' : ''}`;

        await GrievanceUpdate.create({
            grievanceId: grievance._id,
            userId: req.user ? req.user._id : citizenId,
            type: 'Citizen Response',
            notes: `Grievance submitted under ${category} at ${location}. Priority set to ${prio}.${attachmentData ? ' Photographic evidence attached.' : ''}`,
            authorId,
            authorName,
            authorRole,
            message: initialNote,
            userId: authorId,
            type: formatRoleLabel(authorRole),
            notes: initialNote,
            statusChange: 'Open'
        });

        await auditController.logAudit(req.user ? req.user._id : citizenId, 'Create Grievance', `Created grievance "${title}" for citizen ${citizenName}.`);

        res.status(201).json(grievance);
    } catch (error) {
        // Compensating transaction: purge R2 object if database save failed
        const isClientValidation = error.name === 'ValidationError' ||
            error.code === 'MALFORMED_IMAGE' ||
            error.code === 'FILE_TOO_LARGE' ||
            error.code === 'PIXEL_LIMIT_EXCEEDED' ||
            error.code === 'UNSUPPORTED_FORMAT';

        // Release storage quota reservation if grievance creation failed
        if (storageReservation) {
            try {
                await costGovernorService.releaseReservation({
                    period: storageReservation.period,
                    estimatedBytes: storageReservation.estimatedBytes,
                    isFailure: !isClientValidation
                });
            } catch (relErr) {
                console.warn('[CostGovernor] Failed to release quota reservation:', relErr.message);
            }
        }

        // Compensating transaction: purge object if database save failed
        if (uploadedStorageKey) {
            try {
                await storageService.deleteFromR2(uploadedStorageKey);
                console.warn(`[Compensating Transaction] Purged orphaned R2 asset: ${uploadedStorageKey}`);
                console.warn(`[Compensating Transaction] Purged orphaned storage asset: ${uploadedStorageKey}`);
            } catch (cleanupErr) {
                console.error(`[CRITICAL] Failed to purge orphaned R2 asset ${uploadedStorageKey}: ${cleanupErr.message}`);
                console.error(`[CRITICAL] Failed to purge orphaned storage asset ${uploadedStorageKey}: ${cleanupErr.message}`);
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

        const id = req.params.id ? String(req.params.id).trim() : '';
        if (!id) {
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

        // Permission Boundary Check: Officers and Citizens CANNOT assign or reassign officers
        if (req.body.assignedTo !== undefined) {
            const userRole = normalizeRole(req.user.role);
            if (userRole === 'officer' || userRole === 'citizen') {
                return res.status(403).json({ message: 'Access forbidden: Only administrators and managers can assign or reassign field officers' });
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
            const officerNote = `Assigned to field officer ${assignedOfficerObj.name}.`;
            await GrievanceUpdate.create({
                grievanceId: grievance._id,
                authorId: req.user._id,
                authorName: req.user.name,
                authorRole: normalizeRole(req.user.role),
                message: officerNote,
                userId: req.user._id,
                type: 'Officer Field Note',
                notes: officerNote,
                statusChange: updatedGrievance.status
            });

            await auditController.logAudit(req.user._id, 'Assign Officer', `Assigned grievance "${grievance.title}" to officer ${assignedOfficerObj.name}.`);

            try {
                if (mongoose.connection && mongoose.connection.readyState === 1) {
                    await createNotificationSafe({
                        recipient: assignedOfficerObj._id,
                        actor: req.user._id,
                        title: 'New Grievance Assigned',
                        message: `You have been assigned to handle grievance "${grievance.title}".`,
                        type: 'ASSIGNMENT',
                        grievanceId: grievance._id,
                        eventKey: `assign:${grievance._id}:${assignedOfficerObj._id}`
                    });
                }
            } catch (notifyErr) {
                console.warn('[Notification] Non-blocking assignment dispatch warning:', notifyErr.message);
            }
        }

        if (updateData.status && updateData.status !== oldStatus) {
            const statusNote = `Status updated from ${oldStatus} to ${updateData.status}.`;
            await GrievanceUpdate.create({
                grievanceId: grievance._id,
                authorId: req.user._id,
                authorName: req.user.name,
                authorRole: normalizeRole(req.user.role),
                message: statusNote,
                userId: req.user._id,
                type: 'Status Update',
                notes: statusNote,
                statusChange: updateData.status
            });

            await auditController.logAudit(req.user._id, 'Update Grievance', `Changed grievance "${grievance.title}" status from ${oldStatus} to ${updateData.status}.`);

            let citizen = null;
            // Safe notification dispatch to the citizen
            try {
                if (mongoose.connection && mongoose.connection.readyState === 1) {
                    let citizenUserId = null;
                    citizen = await Citizen.findById(grievance.citizenId);
                    if (citizen) {
                        citizenUserId = citizen.linkedUserId;
                        if (!citizenUserId) {
                            const u = await User.findOne({ email: citizen.email });
                            if (u) citizenUserId = u._id;
                        }
                    }
                    if (!citizenUserId) {
                        const directUser = await User.findById(grievance.citizenId);
                        if (directUser) citizenUserId = directUser._id;
                    }

                    if (citizenUserId) {
                        await createNotificationSafe({
                            recipient: citizenUserId,
                            actor: req.user._id,
                            title: 'Grievance Status Updated',
                            message: `Your grievance "${grievance.title}" status has been updated to: ${updateData.status}.`,
                            type: 'STATUS_CHANGE',
                            grievanceId: grievance._id,
                            eventKey: `status:${grievance._id}:${updateData.status}`
                        });
                    }
                }
            } catch (notifyErr) {
                console.warn('[Notification] Non-blocking status dispatch warning:', notifyErr.message);
            }

            // Email alert simulation/sending
            if (!citizen && mongoose.connection && mongoose.connection.readyState === 1) {
                try {
                    citizen = await Citizen.findById(grievance.citizenId);
                } catch (e) {}
            }
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
 * Complaint Risk Analysis Engine
 * 
 * Deterministic, rule-based heuristic scoring engine (non-ML) combining 6 operational inputs:
 * 1. Complaint Age: +5 to +25 points based on open duration (24h/48h/72h thresholds).
 * 2. Priority Level: Critical (+30), High (+20), Medium (+10), Low (+5).
 * 3. Municipal Category: Essential civic services (+15), Infrastructure (+10), Standard (+5).
 * 4. Assignment Status: Unassigned officer >= 12h (+15) or awaiting assignment (+5).
 * 5. Citizen Follow-ups: +5 points per citizen inquiry (capped at +20).
 * 6. Pending Duration / Expected Resolution: Past expected resolution time (+25), or deadline imminent (+15).
 * 
 * Output:
 * - numericScore: 0 to 100 integer
 * - riskScore / riskLevel: 'Critical' (80-100), 'High' (60-79), 'Medium' (35-59), 'Low' (0-34)
 * - reasons: itemized explanation of every contributing operational indicator
 * - recommendedAction: clear operational guidance
 */
const generateInsights = async (req, res) => {
    try {
        const citizens = await Citizen.find();
        const insights = [];
        const now = new Date();

        for (const citizen of citizens) {
            const citizenGrievances = await Grievance.find({
                citizenId: citizen._id,
                status: { $ne: 'Resolved' }
            });

            const openCount = citizenGrievances.length;
            let highestScore = 0;
            let dominantCategory = '';
            let reasons = [];

            if (openCount === 0) {
                reasons.push('No active grievances filed. All accounts in good standing.');
            }

            for (const g of citizenGrievances) {
                let ticketScore = 0;
                const ticketReasons = [];

                // 1. Complaint Age (hours open)
                const ageHours = Math.max(0, Math.floor((now - new Date(g.createdAt)) / (1000 * 60 * 60)));
                if (ageHours >= 72) {
                    ticketScore += 25;
                    ticketReasons.push(`Complaint open for ${ageHours}h (exceeds 72h aging threshold): +25 pts`);
                } else if (ageHours >= 48) {
                    ticketScore += 15;
                    ticketReasons.push(`Complaint open for ${ageHours}h (exceeds 48h aging threshold): +15 pts`);
                } else if (ageHours >= 24) {
                    ticketScore += 10;
                    ticketReasons.push(`Complaint open for ${ageHours}h (exceeds 24h aging threshold): +10 pts`);
                } else {
                    ticketScore += 5;
                    ticketReasons.push(`Recent complaint filed within past 24h (${ageHours}h open): +5 pts`);
                }

                // 2. Priority Level
                if (g.priority === 'Critical') {
                    ticketScore += 30;
                    ticketReasons.push(`Critical Priority Level: +30 pts`);
                } else if (g.priority === 'High') {
                    ticketScore += 20;
                    ticketReasons.push(`High Priority Level: +20 pts`);
                } else if (g.priority === 'Medium') {
                    ticketScore += 10;
                    ticketReasons.push(`Medium Priority Level: +10 pts`);
                } else {
                    ticketScore += 5;
                    ticketReasons.push(`Low Priority Level: +5 pts`);
                }

                // 3. Municipal Category Weight
                if (['Water Supply', 'Sanitation', 'Public Safety'].includes(g.category)) {
                    ticketScore += 15;
                    ticketReasons.push(`Essential civic service category (${g.category}): +15 pts`);
                } else if (['Roads', 'Roads & Traffic', 'Electricity'].includes(g.category)) {
                    ticketScore += 10;
                    ticketReasons.push(`Infrastructure service category (${g.category}): +10 pts`);
                } else {
                    ticketScore += 5;
                    ticketReasons.push(`Standard service category (${g.category}): +5 pts`);
                }

                // 4. Assignment Status
                if (!g.assignedTo) {
                    if (ageHours >= 12) {
                        ticketScore += 15;
                        ticketReasons.push(`Field officer unassigned after ${ageHours}h: +15 pts`);
                    } else {
                        ticketScore += 5;
                        ticketReasons.push(`Awaiting field officer assignment: +5 pts`);
                    }
                }

                // 5. Citizen Follow-ups
                const followups = await GrievanceUpdate.countDocuments({
                    grievanceId: g._id,
                    authorRole: 'citizen'
                });
                if (followups > 0) {
                    const followupPoints = Math.min(20, followups * 5);
                    ticketScore += followupPoints;
                    ticketReasons.push(`Citizen follow-up inquiries (${followups} submitted): +${followupPoints} pts`);
                }

                // 6. Pending Duration / Expected Resolution Time
                if (g.deadline) {
                    const deadlineDate = new Date(g.deadline);
                    if (now > deadlineDate) {
                        const overdueHours = Math.floor((now - deadlineDate) / (1000 * 60 * 60));
                        ticketScore += 25;
                        ticketReasons.push(`Past expected resolution time by ${overdueHours}h: +25 pts`);
                    } else {
                        const hoursRemaining = (deadlineDate - now) / (1000 * 60 * 60);
                        if (hoursRemaining <= 12) {
                            ticketScore += 15;
                            ticketReasons.push(`Expected resolution deadline imminent (${Math.round(hoursRemaining)}h remaining): +15 pts`);
                        }
                    }
                }

                if (ticketScore > highestScore) {
                    highestScore = ticketScore;
                    dominantCategory = g.category;
                    reasons = ticketReasons;
                }
            }

            if (openCount >= 2) {
                reasons.push(`Multiple active complaints pending for citizen (${openCount})`);
                highestScore += Math.min(15, (openCount - 1) * 5);
            }

            const numericScore = Math.min(100, Math.max(0, highestScore));

            let riskLabel = 'Low';
            let recommendation = 'Routine workflow: Complaint is progressing within normal expected resolution parameters.';

            if (numericScore >= 80) {
                riskLabel = 'Critical';
                recommendation = `Immediate Manager intervention: Critical delay or risk detected in ${dominantCategory || 'service area'}. Expedite emergency response and initiate direct citizen contact.`;
            } else if (numericScore >= 60) {
                riskLabel = 'High';
                recommendation = `Manager review required: Expected resolution window imminent or delayed in ${dominantCategory || 'service area'}. Reassign or dispatch senior field officer immediately.`;
            } else if (numericScore >= 35) {
                riskLabel = 'Medium';
                recommendation = `Standard supervisory monitoring: Active complaint pending field inspection. Ensure assigned officer provides progress updates.`;
            }

            citizen.escalationRisk = riskLabel === 'Critical' ? 'High' : riskLabel;
            await citizen.save();

            let insight = await Insight.findOne({ citizenId: citizen._id });
            if (insight) {
                insight.numericScore = numericScore;
                insight.riskScore = riskLabel;
                insight.recommendation = recommendation;
                insight.reasons = reasons;
                insight.riskFactors = reasons;
                insight.engineType = 'DETERMINISTIC_HEURISTIC';
                insight.generatedAt = Date.now();
                await insight.save();
            } else {
                insight = await Insight.create({
                    citizenId: citizen._id,
                    numericScore,
                    riskScore: riskLabel,
                    recommendation,
                    reasons,
                    riskFactors: reasons,
                    engineType: 'DETERMINISTIC_HEURISTIC'
                });
            }
            insights.push(insight);
        }

        await auditController.logAudit(req.user._id, 'Run Risk Analysis Engine', 'Executed deterministic rule-based Complaint Risk Analysis Engine.');

        res.status(200).json(insights);
    } catch (error) {
        console.error('generateInsights error:', error);
        res.status(500).json({ message: error.message });
    }
};

const getInsights = async (req, res) => {
    try {
        const insights = await Insight.find()
            .populate('citizenId', 'name email contact address status escalationRisk')
            .sort('-numericScore');
        res.status(200).json(insights);
    } catch (error) {
        console.error('getInsights error:', error);
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
    getInsights,
    generateRiskAnalysis: generateInsights,
    getRiskAnalysis: getInsights
};

