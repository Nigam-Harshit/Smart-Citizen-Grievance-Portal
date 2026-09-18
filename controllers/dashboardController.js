const Citizen = require('../models/Citizen');
const Grievance = require('../models/Grievance');
const { getAllAssociatedIds } = require('../utils/identityHelper');

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

        const openCount = await Grievance.countDocuments({
            ...grievanceQuery,
            status: 'Open',
            assignedTo: null
        });

        const assignedCount = await Grievance.countDocuments({
            ...grievanceQuery,
            status: 'Open',
            assignedTo: { $ne: null }
        });

        const inProgressCount = await Grievance.countDocuments({
            ...grievanceQuery,
            status: 'In Progress'
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

        // Exact complaint status distribution for management analytics
        const statusDistribution = [
            { status: 'Open', count: openCount },
            { status: 'Assigned', count: assignedCount },
            { status: 'In Progress', count: inProgressCount },
            { status: 'Resolved', count: resolvedGrievances },
            { status: 'Delayed', count: overdueCount }
        ];

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
        // Status breakdown aggregation (legacy)
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
        // Real Average Resolution Time computation (in hours) via database aggregation
        const resTimeAgg = await Grievance.aggregate([
            {
                $match: {
                    ...grievanceQuery,
                    status: 'Resolved',
                    resolvedAt: { $exists: true, $ne: null }
                }
            },
            {
                $project: {
                    durationHours: {
                        $divide: [{ $subtract: ["$resolvedAt", "$createdAt"] }, 1000 * 60 * 60]
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    avgHours: { $avg: "$durationHours" }
                }
            }
        ]);

        const avgResolutionTimeHours = resTimeAgg.length > 0 && resTimeAgg[0].avgHours
            ? Math.round(resTimeAgg[0].avgHours * 10) / 10
            : 0;

        res.status(200).json({
            totalCitizens,
            totalGrievances,
            activeGrievances,
            resolvedGrievances,
            overdueCount,
            delayedCount: overdueCount,
            highRiskCitizens,
            avgResolutionTimeHours,
            statusDistribution,
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
 * Field Officer: Tickets assigned to me, not resolved, sorted by expected resolution deadline ascending
 * Manager: Unassigned tickets in scope + In-progress tickets in scope approaching or past expected resolution time
 * Admin: All delayed tickets system-wide + system health summary
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

            const officerResolvedCount = await Grievance.countDocuments({
                assignedTo: req.user._id,
                status: 'Resolved'
            });

            return res.status(200).json({
                role: 'officer',
                myQueueCount: myQueue.length,
                resolvedCount: officerResolvedCount,
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

            const managerResolvedCount = await Grievance.countDocuments({
                ...scopeFilter,
                status: 'Resolved'
            });

            return res.status(200).json({
                role: 'manager',
                scope,
                unassignedCount: unassignedInScope.length,
                unassignedInScope,
                breachingCount: breachingOrOverdueInScope.length,
                breachingOrOverdueInScope,
                resolvedCount: managerResolvedCount
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
                resolvedCount: resolvedCount,
                healthSummary: {
                    open: openCount,
                    inProgress: inProgressCount,
                    resolved: resolvedCount,
                    total: openCount + inProgressCount + resolvedCount
                }
            });
        } else {
            // Citizen Queue
            const associatedIds = await getAllAssociatedIds(req.user._id);
            const myGrievances = associatedIds.length > 0
                ? await Grievance.find({ citizenId: { $in: associatedIds } }).sort({ createdAt: -1 })
                : [];

            const citizenResolvedCount = associatedIds.length > 0
                ? await Grievance.countDocuments({ citizenId: { $in: associatedIds }, status: 'Resolved' })
                : 0;

            return res.status(200).json({
                role: 'citizen',
                myCount: myGrievances.length,
                resolvedCount: citizenResolvedCount,
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
