const Citizen = require('../models/Citizen');
const Grievance = require('../models/Grievance');

const getDashboardStats = async (req, res) => {
    try {
        let grievanceQuery = {};
        if (req.user && req.user.role === 'manager' && req.user.scope && req.user.scope !== 'All') {
            grievanceQuery.category = req.user.scope;
        }

        const totalCitizens = await Citizen.countDocuments();
        const totalGrievances = await Grievance.countDocuments(grievanceQuery);

        const activeGrievances = await Grievance.countDocuments({
            ...grievanceQuery,
            status: { $in: ['Open', 'In Progress'] }
        });

        const resolvedGrievances = await Grievance.countDocuments({
            ...grievanceQuery,
            status: 'Resolved'
        });

        const overdueCount = await Grievance.countDocuments({
            ...grievanceQuery,
            status: { $ne: 'Resolved' },
            deadline: { $lt: new Date() }
        });

        const highRiskCitizens = await Citizen.countDocuments({
            escalationRisk: 'High'
        });

        // Category breakdown aggregation
        const categoryDistribution = await Grievance.aggregate([
            ...(Object.keys(grievanceQuery).length > 0 ? [{ $match: grievanceQuery }] : []),
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Status breakdown aggregation
        const grievanceStatusDistribution = await Grievance.aggregate([
            ...(Object.keys(grievanceQuery).length > 0 ? [{ $match: grievanceQuery }] : []),
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Priority breakdown aggregation
        const priorityDistribution = await Grievance.aggregate([
            ...(Object.keys(grievanceQuery).length > 0 ? [{ $match: grievanceQuery }] : []),
            {
                $group: {
                    _id: "$priority",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Monthly Filing & Resolution Trend
        const monthlyGrievanceTrend = await Grievance.aggregate([
            ...(Object.keys(grievanceQuery).length > 0 ? [{ $match: grievanceQuery }] : []),
            {
                $group: {
                    _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
                    filedCount: { $sum: 1 },
                    resolvedCount: {
                        $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] }
                    }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        // Average resolution time computation (in hours)
        const resolvedDocs = await Grievance.find({ ...grievanceQuery, status: 'Resolved', resolvedAt: { $exists: true } });
        let totalResolutionHours = 0;
        let avgResolutionTimeHours = 0;
        if (resolvedDocs.length > 0) {
            resolvedDocs.forEach(g => {
                const diffMs = new Date(g.resolvedAt) - new Date(g.createdAt);
                totalResolutionHours += diffMs / (1000 * 60 * 60);
            });
            avgResolutionTimeHours = Math.round((totalResolutionHours / resolvedDocs.length) * 10) / 10;
        }

        res.status(200).json({
            totalCitizens,
            totalGrievances,
            activeGrievances,
            resolvedGrievances,
            overdueCount,
            highRiskCitizens,
            avgResolutionTimeHours,
            categoryDistribution,
            grievanceStatusDistribution,
            priorityDistribution,
            monthlyGrievanceTrend,
            userScope: req.user ? req.user.scope || 'All' : 'All'
        });

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * Task 5: Role-Scoped Duty Queue Widget Handler
 * Field Officer: Tickets assigned to me, not resolved, sorted by SLA deadline ascending
 * Manager: Unassigned tickets in scope + In-progress tickets in scope approaching or past SLA breach
 * Admin: All SLA breached tickets system-wide + system health summary
 */
const getDutyQueue = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const role = req.user.role;
        const scope = req.user.scope || 'All';
        const now = new Date();
        const next24Hours = new Date(now.getTime() + (24 * 60 * 60 * 1000));

        if (role === 'officer' || role === 'field_officer') {
            // Field Officer Duty Queue
            const myQueue = await Grievance.find({
                assignedTo: req.user._id,
                status: { $ne: 'Resolved' }
            })
            .populate('citizenId', 'name email contact')
            .sort({ deadline: 1 });

            return res.status(200).json({
                role: 'officer',
                myQueueCount: myQueue.length,
                myQueue
            });
        } else if (role === 'manager') {
            // Manager Scope Duty Queue
            const scopeFilter = (scope && scope !== 'All') ? { category: scope } : {};

            const unassignedInScope = await Grievance.find({
                ...scopeFilter,
                assignedTo: null,
                status: { $ne: 'Resolved' }
            })
            .populate('citizenId', 'name email contact')
            .sort({ createdAt: -1 });

            const breachingOrOverdueInScope = await Grievance.find({
                ...scopeFilter,
                status: { $ne: 'Resolved' },
                deadline: { $lt: next24Hours }
            })
            .populate('citizenId', 'name email contact')
            .populate('assignedTo', 'name email role')
            .sort({ deadline: 1 });

            return res.status(200).json({
                role: 'manager',
                scope,
                unassignedCount: unassignedInScope.length,
                unassignedInScope,
                breachingCount: breachingOrOverdueInScope.length,
                breachingOrOverdueInScope
            });
        } else if (role === 'admin') {
            // Admin System-Wide Duty Queue
            const systemBreached = await Grievance.find({
                status: { $ne: 'Resolved' },
                deadline: { $lt: now }
            })
            .populate('citizenId', 'name email contact')
            .populate('assignedTo', 'name email role')
            .sort({ deadline: 1 });

            const openCount = await Grievance.countDocuments({ status: 'Open' });
            const inProgressCount = await Grievance.countDocuments({ status: 'In Progress' });
            const resolvedCount = await Grievance.countDocuments({ status: 'Resolved' });

            return res.status(200).json({
                role: 'admin',
                breachedCount: systemBreached.length,
                systemBreached,
                healthSummary: {
                    open: openCount,
                    inProgress: inProgressCount,
                    resolved: resolvedCount,
                    total: openCount + inProgressCount + resolvedCount
                }
            });
        } else {
            // Citizen Queue
            let citizenDoc = await Citizen.findOne({ linkedUserId: req.user._id });
            if (!citizenDoc && req.user.linkedCitizenId) {
                citizenDoc = await Citizen.findById(req.user.linkedCitizenId);
            }

            const citizenId = citizenDoc ? citizenDoc._id : null;
            const myGrievances = citizenId ? await Grievance.find({ citizenId }).sort({ createdAt: -1 }) : [];

            return res.status(200).json({
                role: 'citizen',
                myCount: myGrievances.length,
                myGrievances
            });
        }
    } catch (error) {
        console.error('Error fetching duty queue:', error);
        res.status(500).json({ message: 'Server Error fetching duty queue' });
    }
};

module.exports = {
    getDashboardStats,
    getDutyQueue
};
