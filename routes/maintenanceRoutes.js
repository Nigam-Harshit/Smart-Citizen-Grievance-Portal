const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');
const Citizen = require('../models/Citizen');
const Grievance = require('../models/Grievance');
const GrievanceUpdate = require('../models/GrievanceUpdate');
const AuditLog = require('../models/AuditLog');
const Insight = require('../models/Insight');
const { maintenanceLimiter } = require('../middleware/rateLimiter');

// Rate limit all maintenance routes to prevent secret brute-forcing
router.use(maintenanceLimiter);

/**
 * Constant-time string comparison using SHA-256 pre-hashing to eliminate
 * timing side-channels and length leakage.
 */
const safeSecretCompare = (a, b) => {
    if (!a || !b || typeof a !== 'string' || typeof b !== 'string') return false;
    const hashA = crypto.createHash('sha256').update(a).digest();
    const hashB = crypto.createHash('sha256').update(b).digest();
    return crypto.timingSafeEqual(hashA, hashB);
};

// Security middleware: Require x-maintenance-secret matching dedicated maintenance key or JWT_SECRET
router.use((req, res, next) => {
    const configuredKey = process.env.MAINTENANCE_KEY || (process.env.NODE_ENV === 'production' ? null : 'civic_demo_maintenance_key_2026');
    const jwtSecret = process.env.JWT_SECRET;

    // Fail closed if neither secret is configured
    if (!configuredKey && !jwtSecret) {
        return res.status(503).json({ message: 'Maintenance interface unavailable: Secret not configured' });
    }

    const secret = req.headers['x-maintenance-secret'];
    if (!secret || typeof secret !== 'string') {
        return res.status(403).json({ message: 'Forbidden: Missing maintenance secret' });
    }

    const matchesMaintenanceKey = configuredKey && safeSecretCompare(secret, configuredKey);
    const matchesJwtSecret = jwtSecret && safeSecretCompare(secret, jwtSecret);

    if (!matchesMaintenanceKey && !matchesJwtSecret) {
        return res.status(403).json({ message: 'Forbidden: Invalid maintenance secret' });
    }
    next();
});

// 1. Inspect endpoint
router.get('/inspect', async (req, res) => {
    try {
        const users = await User.find().select('name email role scope phone linkedCitizenId createdAt');
        const citizens = await Citizen.find();
        const grievances = await Grievance.find();
        const updates = await GrievanceUpdate.find();

        const roleCounts = {};
        const staffList = [];
        const citizenList = [];

        users.forEach(u => {
            roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
            if (u.role === 'citizen') {
                citizenList.push({ id: u._id, name: u.name, email: u.email, linkedCitizenId: u.linkedCitizenId });
            } else {
                staffList.push({ id: u._id, name: u.name, email: u.email, role: u.role, scope: u.scope, phone: u.phone });
            }
        });

        const categoryCounts = {};
        grievances.forEach(g => {
            categoryCounts[g.category] = (categoryCounts[g.category] || 0) + 1;
        });

        res.status(200).json({
            totalUsers: users.length,
            totalCitizens: citizens.length,
            totalCitizenUsers: citizenList.length,
            totalStaffUsers: staffList.length,
            roleCounts,
            staffList,
            citizenList,
            totalGrievances: grievances.length,
            categoryCounts,
            totalUpdates: updates.length
        });
    } catch (err) {
        console.error('Maintenance inspect error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 2. Full Database Backup endpoint
router.get('/backup', async (req, res) => {
    try {
        const users = await User.find();
        const citizens = await Citizen.find();
        const grievances = await Grievance.find();
        const updates = await GrievanceUpdate.find();
        const insights = await Insight.find();

        res.status(200).json({
            timestamp: new Date().toISOString(),
            counts: {
                users: users.length,
                citizens: citizens.length,
                grievances: grievances.length,
                updates: updates.length,
                insights: insights.length
            },
            data: {
                users,
                citizens,
                grievances,
                updates,
                insights
            }
        });
    } catch (err) {
        console.error('Maintenance backup error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 3. Clean and re-seed Citizen & Citizen Grievance data
router.post('/cleanup-and-seed', async (req, res) => {
    try {
        // --- STEP A: CAPTURE INITIAL STATE ---
        const initialStaff = await User.find({ role: { $ne: 'citizen' } }).lean();
        const initialStaffCount = initialStaff.length;
        const initialStaffEmails = new Set(initialStaff.map(s => s.email));

        const initialUsers = await User.find().lean();
        const initialCitizens = await Citizen.find().lean();
        const initialGrievances = await Grievance.find().lean();
        const initialUpdates = await GrievanceUpdate.find().lean();

        const beforeRoleCounts = {};
        initialUsers.forEach(u => {
            beforeRoleCounts[u.role] = (beforeRoleCounts[u.role] || 0) + 1;
        });

        // Safety check: Abort if staff is somehow empty
        if (initialStaffCount === 0) {
            return res.status(500).json({ error: 'Safety abort: No staff users found in database' });
        }

        // --- STEP B: IDENTIFY CITIZEN RECORDS FOR REMOVAL ---
        const citizenUsers = initialUsers.filter(u => u.role === 'citizen');
        const citizenUserIds = citizenUsers.map(u => u._id);

        const allCitizenDocs = await Citizen.find();
        const citizenDocIds = allCitizenDocs.map(c => c._id);

        // Combined set of all citizen IDs (Citizen._id or User._id)
        const allCitizenIdsToDelete = [...citizenUserIds, ...citizenDocIds];

        // Identify grievances to remove (belonging to any citizen)
        const grievancesToRemove = await Grievance.find({
            $or: [
                { citizenId: { $in: allCitizenIdsToDelete } },
                { citizenEmail: { $in: citizenUsers.map(u => u.email) } }
            ]
        });
        const grievanceIdsToRemove = grievancesToRemove.map(g => g._id);

        // --- STEP C: EXECUTE SCOPED REMOVAL ---
        // 1. Remove updates for citizen grievances
        const deletedUpdatesResult = await GrievanceUpdate.deleteMany({
            grievanceId: { $in: grievanceIdsToRemove }
        });

        // 2. Remove insights for citizens
        const deletedInsightsResult = await Insight.deleteMany({
            citizenId: { $in: allCitizenIdsToDelete }
        });

        // 3. Remove citizen grievances
        const deletedGrievancesResult = await Grievance.deleteMany({
            _id: { $in: grievanceIdsToRemove }
        });

        // 4. Remove citizen profiles
        const deletedCitizensResult = await Citizen.deleteMany({
            _id: { $in: citizenDocIds }
        });

        // 5. Remove citizen user accounts ONLY (role === 'citizen')
        const deletedUsersResult = await User.deleteMany({
            role: 'citizen'
        });

        // --- STEP D: CREATE EXACTLY 5 DEMO CITIZENS ---
        const demoCitizensConfig = [
            {
                name: 'Demo 1',
                email: 'demo1@smartcitizen.demo',
                phone: '+91 98401 10001',
                address: '12, Nageswaran Road, T. Nagar, Chennai - 600017',
                category: 'Roads & Traffic',
                title: 'Deep Potholes and Damaged Asphalt on Usman Road',
                description: 'Multiple large potholes have formed near Usman Road intersection, causing severe vehicular slowdowns and hazard for two-wheelers during peak traffic.',
                priority: 'High',
                location: 'T. Nagar, Chennai',
                slaHours: 72 // 3 days
            },
            {
                name: 'Demo 2',
                email: 'demo2@smartcitizen.demo',
                phone: '+91 98402 20002',
                address: '45, 2nd Main Road, Gandhi Nagar, Adyar, Chennai - 600020',
                category: 'Water Supply',
                title: 'Low Water Pressure and Intermittent Pipeline Supply',
                description: 'Residential municipal water supply line has experienced negligible pressure for the past 48 hours along 2nd Main Road.',
                priority: 'Medium',
                location: 'Adyar, Chennai',
                slaHours: 168 // 7 days
            },
            {
                name: 'Demo 3',
                email: 'demo3@smartcitizen.demo',
                phone: '+91 98403 30003',
                address: '78, 100 Feet Bypass Road, Velachery, Chennai - 600042',
                category: 'Sanitation',
                title: 'Overflowing Community Garbage Bins on 100 Feet Road',
                description: 'Solid municipal waste collection bins have not been cleared for two days, overflowing onto the pedestrian pathway.',
                priority: 'Medium',
                location: 'Velachery, Chennai',
                slaHours: 168 // 7 days
            },
            {
                name: 'Demo 4',
                email: 'demo4@smartcitizen.demo',
                phone: '+91 98404 40004',
                address: '22, 3rd Avenue, Shanthi Colony, Anna Nagar, Chennai - 600040',
                category: 'Electricity',
                title: 'Non-Functional Street Lights Along 3rd Avenue',
                description: 'A stretch of eight LED street lighting poles has been dark since yesterday night, reducing visibility on the main residential avenue.',
                priority: 'Low',
                location: 'Anna Nagar, Chennai',
                slaHours: 336 // 14 days
            },
            {
                name: 'Demo 5',
                email: 'demo5@smartcitizen.demo',
                phone: '+91 98405 50005',
                address: '5, GST Road, Near Bus Terminus, Tambaram, Chennai - 600045',
                category: 'Public Safety',
                title: 'Missing Open Stormwater Drain Grate Near Bus Stop',
                description: 'The safety metal grate covering the roadside stormwater drain is displaced and missing, posing an immediate falling hazard to commuters.',
                priority: 'Critical',
                location: 'Tambaram, Chennai',
                slaHours: 24 // 24 hours
            }
        ];

        const createdCitizens = [];
        const createdGrievances = [];

        for (const item of demoCitizensConfig) {
            // 1. Create User account with role 'citizen'
            const user = await User.create({
                name: item.name,
                email: item.email,
                password: 'Demo@12345',
                phone: item.phone,
                role: 'citizen',
                scope: 'All'
            });

            // 2. Create linked Citizen profile
            const citizen = await Citizen.create({
                name: item.name,
                email: item.email,
                contact: item.phone,
                address: item.address,
                linkedUserId: user._id,
                status: 'Active',
                escalationRisk: item.priority === 'Critical' ? 'High' : 'Low',
                lastActivity: new Date()
            });

            // Link citizen to user
            user.linkedCitizenId = citizen._id;
            await user.save();

            // 3. Compute SLA deadline
            const deadline = new Date(Date.now() + item.slaHours * 60 * 60 * 1000);

            // 4. Create Grievance
            const grievance = await Grievance.create({
                citizenId: citizen._id,
                citizenName: item.name,
                citizenEmail: item.email,
                title: item.title,
                description: item.description,
                category: item.category,
                location: item.location,
                priority: item.priority,
                status: 'Open',
                assignedTo: null,
                officerName: '',
                deadline
            });

            // 5. Create initial GrievanceUpdate timeline record
            await GrievanceUpdate.create({
                grievanceId: grievance._id,
                userId: user._id,
                type: 'Citizen Response',
                notes: `Grievance submitted under ${item.category} at ${item.location}. Priority set to ${item.priority}.`,
                statusChange: 'Open'
            });

            // 6. Create AuditLog entry
            await AuditLog.create({
                userId: user._id,
                action: 'Create Grievance',
                details: `Created demo grievance "${item.title}" for citizen ${item.name}.`
            });

            createdCitizens.push({
                userId: user._id,
                citizenId: citizen._id,
                name: user.name,
                email: user.email
            });

            createdGrievances.push({
                grievanceId: grievance._id,
                citizenName: grievance.citizenName,
                citizenEmail: grievance.citizenEmail,
                category: grievance.category,
                priority: grievance.priority,
                location: grievance.location,
                status: grievance.status,
                deadline: grievance.deadline
            });
        }

        // --- STEP E: FINAL INTEGRITY VERIFICATION ---
        const finalStaff = await User.find({ role: { $ne: 'citizen' } }).lean();
        const finalStaffCount = finalStaff.length;
        const finalStaffEmails = new Set(finalStaff.map(s => s.email));

        // Check if any staff was changed or deleted
        let staffPreserved = true;
        if (finalStaffCount !== initialStaffCount) {
            staffPreserved = false;
        }
        for (const email of initialStaffEmails) {
            if (!finalStaffEmails.has(email)) staffPreserved = false;
        }

        const finalUsers = await User.find().lean();
        const afterRoleCounts = {};
        finalUsers.forEach(u => {
            afterRoleCounts[u.role] = (afterRoleCounts[u.role] || 0) + 1;
        });

        const finalCitizens = await Citizen.find().lean();
        const finalGrievances = await Grievance.find().lean();

        res.status(200).json({
            success: true,
            staffPreserved,
            initialStaffCount,
            finalStaffCount,
            before: {
                totalUsers: initialUsers.length,
                roleCounts: beforeRoleCounts,
                totalCitizens: initialCitizens.length,
                totalGrievances: initialGrievances.length,
                totalUpdates: initialUpdates.length
            },
            deleted: {
                users: deletedUsersResult.deletedCount,
                citizens: deletedCitizensResult.deletedCount,
                grievances: deletedGrievancesResult.deletedCount,
                updates: deletedUpdatesResult.deletedCount,
                insights: deletedInsightsResult.deletedCount
            },
            after: {
                totalUsers: finalUsers.length,
                roleCounts: afterRoleCounts,
                totalCitizens: finalCitizens.length,
                totalGrievances: finalGrievances.length
            },
            demoCitizens: createdCitizens,
            demoGrievances: createdGrievances,
            staffList: finalStaff.map(s => ({
                id: s._id,
                name: s.name,
                email: s.email,
                role: s.role,
                scope: s.scope
            }))
        });
    } catch (err) {
        console.error('Maintenance cleanup-and-seed error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 4. Storage Consistency & Orphan Reconciliation endpoint
const { reconcileStorage } = require('../services/reconciliationService');
let isReconciling = false;

router.post('/reconcile-storage', async (req, res) => {
    // Concurrency guard: prevent overlapping reconciliation runs
    if (isReconciling) {
        return res.status(409).json({ error: 'Reconciliation is currently in progress. Please wait for the current run to finish.' });
    }

    isReconciling = true;
    try {
        // Safe default: only boolean false triggers destructive mode (string "false" remains safe dry-run)
        const isExplicitDestructive = Boolean(req.body && req.body.dryRun === false);
        const dryRun = !isExplicitDestructive;
        const options = { dryRun };

        // Validate safetyWindowHours: must be a positive integer between 1 and 720 hours if provided
        if (req.body && req.body.safetyWindowHours !== undefined) {
            const hours = Number(req.body.safetyWindowHours);
            if (!Number.isInteger(hours) || hours < 1 || hours > 720) {
                return res.status(400).json({
                    error: 'Invalid safetyWindowHours. Must be an integer between 1 and 720 hours.'
                });
            }
            options.safetyWindowMs = hours * 60 * 60 * 1000;
        }

        const report = await reconcileStorage(options);
        res.status(200).json(report);
    } catch (err) {
        console.error('Maintenance reconcile-storage error:', err);
        res.status(500).json({ error: 'Storage reconciliation failed: ' + err.message });
    } finally {
        isReconciling = false;
    }
});

module.exports = router;


