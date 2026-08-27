const Citizen = require('../models/Citizen');
const Grievance = require('../models/Grievance');

const getDashboardStats = async (req, res) => {
    try {
        const totalCitizens = await Citizen.countDocuments();
        const totalGrievances = await Grievance.countDocuments();

        const activeGrievances = await Grievance.countDocuments({
            status: { $in: ['Open', 'In Progress'] }
        });

        const resolvedGrievances = await Grievance.countDocuments({
            status: 'Resolved'
        });

        const overdueCount = await Grievance.countDocuments({
            status: { $ne: 'Resolved' },
            deadline: { $lt: new Date() }
        });

        const highRiskCitizens = await Citizen.countDocuments({
            escalationRisk: 'High'
        });

        // Category breakdown aggregation
        const categoryDistribution = await Grievance.aggregate([
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Status breakdown aggregation
        const grievanceStatusDistribution = await Grievance.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Escalation Risk breakdown aggregation
        const riskDistribution = await Citizen.aggregate([
            {
                $group: {
                    _id: "$escalationRisk",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Priority breakdown aggregation
        const priorityDistribution = await Grievance.aggregate([
            {
                $group: {
                    _id: "$priority",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Monthly Filing & Resolution Trend
        const monthlyGrievanceTrend = await Grievance.aggregate([
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
        const resolvedDocs = await Grievance.find({ status: 'Resolved', resolvedAt: { $exists: true } });
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
            riskDistribution,
            priorityDistribution,
            monthlyGrievanceTrend
        });

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getDashboardStats
};
