const cron = require('node-cron');
const sendEmail = require('./sendEmail');
const Grievance = require('../models/Grievance');
const Citizen = require('../models/Citizen');

const initCronJobs = () => {
    // Run every day at 8:00 AM to check for overdue / SLA-breached grievances
    cron.schedule('0 8 * * *', async () => {
        console.log('⏰ Running daily SLA breach automation scan...');
        try {
            const overdueGrievances = await Grievance.find({
                status: { $ne: 'Resolved' },
                deadline: { $lt: new Date() }
            }).populate('citizenId', 'name email');
            
            console.log(`[SLA Scan] Found ${overdueGrievances.length} overdue grievance(s).`);

            for (const item of overdueGrievances) {
                console.log(`Alert: Grievance "${item.title}" (Citizen: ${item.citizenName}) has breached its resolution deadline (${item.deadline.toISOString()}).`);
                
                if (item.citizenId && item.citizenId.email && process.env.SMTP_HOST) {
                    await sendEmail({
                        email: item.citizenId.email,
                        subject: `SLA Escalation Alert: ${item.title}`,
                        message: `Dear ${item.citizenName},\n\nYour grievance titled "${item.title}" has breached its standard SLA deadline. It has been escalated to senior department officers for priority resolution.`
                    });
                }
            }
        } catch (error) {
            console.error('Error in daily SLA cron job:', error);
        }
    });

    // Run every Friday at 5:00 PM to send weekly civic resolution summary
    cron.schedule('0 17 * * 5', async () => {
        console.log('📊 Running weekly civic grievance summary report task...');
        try {
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const newFilings = await Grievance.countDocuments({
                createdAt: { $gte: sevenDaysAgo }
            });
            const resolvedCount = await Grievance.countDocuments({
                status: 'Resolved',
                updatedAt: { $gte: sevenDaysAgo }
            });

            const summaryMessage = `Weekly Civic Grievance Summary:\n\nNew Grievances Filed: ${newFilings}\nGrievances Resolved: ${resolvedCount}\n\nPlease login to the Smart Citizen Grievance Portal dashboard for detailed analytics.`;

            if (process.env.ADMIN_EMAIL) {
                await sendEmail({
                    email: process.env.ADMIN_EMAIL,
                    subject: 'Weekly Civic Grievance Management Summary',
                    message: summaryMessage
                });
            } else {
                console.log('Weekly Summary (Console Simulation):\n' + summaryMessage);
            }
        } catch (error) {
            console.error('Error in weekly summary cron job:', error);
        }
    });
};

module.exports = initCronJobs;
