const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const User = require('./models/User');
const Citizen = require('./models/Citizen');
const Grievance = require('./models/Grievance');
const GrievanceUpdate = require('./models/GrievanceUpdate');
const Insight = require('./models/Insight');
const AuditLog = require('./models/AuditLog');

const connectDB = require('./config/db');

const seedData = async () => {
    await connectDB();

    try {
        console.log('🧹 Clearing existing collections...');
        await User.deleteMany({});
        await Citizen.deleteMany({});
        await Grievance.deleteMany({});
        await GrievanceUpdate.deleteMany({});
        await Insight.deleteMany({});
        await AuditLog.deleteMany({});

        console.log('👤 Seeding System Users (Admin, Manager, Officers, Citizen)...');

        // Create Users
        const adminUser = await User.create({
            name: 'System Administrator',
            email: 'admin@grievance.gov.in',
            password: 'Password123!',
            role: 'admin',
            phone: '+91 98765 00001'
        });

        const managerUser = await User.create({
            name: 'Civic Manager - North Zone',
            email: 'manager@grievance.gov.in',
            password: 'Password123!',
            role: 'manager',
            phone: '+91 98765 00002'
        });

        const officer1 = await User.create({
            name: 'Officer Rakesh Sharma',
            email: 'officer.sharma@grievance.gov.in',
            password: 'Password123!',
            role: 'officer',
            phone: '+91 98765 11111'
        });

        const officer2 = await User.create({
            name: 'Officer Sunita Verma',
            email: 'officer.verma@grievance.gov.in',
            password: 'Password123!',
            role: 'officer',
            phone: '+91 98765 22222'
        });

        const citizenUser = await User.create({
            name: 'Rajesh Kumar',
            email: 'citizen.rajesh@gmail.com',
            password: 'Password123!',
            role: 'citizen',
            phone: '+91 98100 12345'
        });

        console.log('🏡 Seeding Citizen Profiles...');

        const c1 = await Citizen.create({
            name: 'Rajesh Kumar',
            email: 'citizen.rajesh@gmail.com',
            contact: '+91 98100 12345',
            address: 'Flat 402, Shanti Heights, Sector 62, Noida, UP',
            status: 'Active',
            escalationRisk: 'High',
            assignedTo: officer1._id,
            linkedUserId: citizenUser._id
        });

        citizenUser.linkedCitizenId = c1._id;
        await citizenUser.save();

        const c2 = await Citizen.create({
            name: 'Priya Patel',
            email: 'priya.patel@yahoo.in',
            contact: '+91 98250 67890',
            address: '12-B Green Park Avenue, Andheri West, Mumbai, MH',
            status: 'Active',
            escalationRisk: 'High',
            assignedTo: officer1._id
        });

        const c3 = await Citizen.create({
            name: 'Amit Singh',
            email: 'amit.singh88@outlook.com',
            contact: '+91 97111 23456',
            address: '74 MG Road, Ward 5, Bengaluru, KA',
            status: 'Active',
            escalationRisk: 'Medium',
            assignedTo: officer2._id
        });

        const c4 = await Citizen.create({
            name: 'Ananya Gupta',
            email: 'ananya.g@gmail.com',
            contact: '+91 99999 44321',
            address: 'House No. 108, Civil Lines, Jaipur, RJ',
            status: 'Active',
            escalationRisk: 'Low',
            assignedTo: officer2._id
        });

        const c5 = await Citizen.create({
            name: 'Vikram Malhotra',
            email: 'vmalhotra@gmail.com',
            contact: '+91 98400 99887',
            address: 'Plot 45, Jubilee Hills, Hyderabad, TS',
            status: 'Active',
            escalationRisk: 'Low',
            assignedTo: officer1._id
        });

        const c6 = await Citizen.create({
            name: 'Meera Joshi',
            email: 'meera.joshi@rediffmail.com',
            contact: '+91 97230 55443',
            address: 'Block C, Salt Lake City, Kolkata, WB',
            status: 'Active',
            escalationRisk: 'Medium',
            assignedTo: officer2._id
        });

        console.log('📋 Seeding Grievances...');

        const now = new Date();
        const past2Days = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
        const past5Days = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
        const past10Days = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

        // Overdue critical deadline
        const overdueDeadline = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        // Future deadlines
        const future2Days = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
        const future5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

        const g1 = await Grievance.create({
            citizenId: c1._id,
            citizenName: c1.name,
            title: 'Contaminated Water Supply in Block 4',
            description: 'Tap water has been brown and foul-smelling for the past 3 days. Multiple residents reporting stomach illness.',
            category: 'Water Supply',
            location: 'Sector 62, Block 4, Noida',
            priority: 'Critical',
            status: 'In Progress',
            assignedTo: officer1._id,
            officerName: officer1.name,
            deadline: overdueDeadline, // Overdue SLA breach
            createdAt: past5Days
        });

        const g2 = await Grievance.create({
            citizenId: c1._id,
            citizenName: c1.name,
            title: 'Severe Street Light Failure on Main Road',
            description: 'Entire stretch of streetlights broken from Pillar 12 to 24. Poses safety threat to pedestrians at night.',
            category: 'Electricity',
            location: 'Main Arterial Road, Sector 62, Noida',
            priority: 'High',
            status: 'Open',
            assignedTo: officer1._id,
            officerName: officer1.name,
            deadline: future2Days,
            createdAt: past2Days
        });

        const g3 = await Grievance.create({
            citizenId: c2._id,
            citizenName: c2.name,
            title: 'Uncollected Garbage Dump Overflowing near School',
            description: 'Sanitation trucks haven\'t picked up waste for 6 days. Trash spilling onto road outside St. Mary\'s High School.',
            category: 'Sanitation',
            location: 'Green Park Avenue, Andheri West, Mumbai',
            priority: 'Critical',
            status: 'Open',
            assignedTo: officer1._id,
            officerName: officer1.name,
            deadline: overdueDeadline,
            createdAt: past10Days
        });

        const g4 = await Grievance.create({
            citizenId: c3._id,
            citizenName: c3.name,
            title: 'Dangerous Potholes causing Accidents on Ward 5 Junction',
            description: 'Deep pothole after monsoon rains causing frequent two-wheeler skidding near MG Road junction.',
            category: 'Roads & Traffic',
            location: 'Ward 5 Junction, MG Road, Bengaluru',
            priority: 'High',
            status: 'In Progress',
            assignedTo: officer2._id,
            officerName: officer2.name,
            deadline: future2Days,
            createdAt: past5Days
        });

        const g5 = await Grievance.create({
            citizenId: c4._id,
            citizenName: c4.name,
            title: 'Broken Traffic Signal causing Gridlock',
            description: 'Signal stuck on red in all directions, causing severe morning peak hour congestion.',
            category: 'Roads & Traffic',
            location: 'Civil Lines Circle, Jaipur',
            priority: 'Medium',
            status: 'Resolved',
            assignedTo: officer2._id,
            officerName: officer2.name,
            deadline: past2Days,
            resolvedAt: past2Days,
            createdAt: past10Days
        });

        const g6 = await Grievance.create({
            citizenId: c5._id,
            citizenName: c5.name,
            title: 'Noise Pollution from Commercial Construction past 10 PM',
            description: 'Illegal night construction activity using heavy machinery after permitted hours.',
            category: 'Public Safety',
            location: 'Jubilee Hills Road No. 36, Hyderabad',
            priority: 'Low',
            status: 'Resolved',
            assignedTo: officer1._id,
            officerName: officer1.name,
            deadline: past5Days,
            resolvedAt: past5Days,
            createdAt: past10Days
        });

        const g7 = await Grievance.create({
            citizenId: c6._id,
            citizenName: c6.name,
            title: 'Low Water Pressure on 3rd Floor Apartments',
            description: 'Municipal supply pressure insufficient to fill overhead tanks during morning hours.',
            category: 'Water Supply',
            location: 'Block C, Salt Lake City, Kolkata',
            priority: 'Medium',
            status: 'In Progress',
            assignedTo: officer2._id,
            officerName: officer2.name,
            deadline: future5Days,
            createdAt: past2Days
        });

        console.log('💬 Seeding Grievance Timeline Updates...');

        await GrievanceUpdate.create({
            grievanceId: g1._id,
            userId: citizenUser._id,
            type: 'Citizen Response',
            notes: 'Grievance submitted with photo evidence of discolored tap water.',
            statusChange: 'Open',
            createdAt: past5Days
        });

        await GrievanceUpdate.create({
            grievanceId: g1._id,
            userId: officer1._id,
            type: 'Officer Note',
            notes: 'Inspected pipeline junction. Identified leak in main pipeline. Water testing team dispatched.',
            statusChange: 'In Progress',
            createdAt: past2Days
        });

        await GrievanceUpdate.create({
            grievanceId: g3._id,
            userId: officer1._id,
            type: 'Escalation',
            notes: 'Escalated to Zonal Sanitation Inspector due to equipment unavailability.',
            statusChange: 'Open',
            createdAt: past2Days
        });

        await GrievanceUpdate.create({
            grievanceId: g5._id,
            userId: officer2._id,
            type: 'Resolution',
            notes: 'Traffic signal motherboard replaced and tested. Signal timing recalibrated.',
            statusChange: 'Resolved',
            createdAt: past2Days
        });

        console.log('🤖 Seeding AI Escalation Risk Insights...');

        await Insight.create({
            citizenId: c1._id,
            riskScore: 'High',
            recommendation: 'URGENT ESCALATION: 1 Critical issue(s) unresolved and 1 SLA Breached / Overdue Grievance(s). Immediate officer dispatch required.',
            riskFactors: ['1 Unresolved Critical Grievance', '1 Overdue SLA Breach', 'Multiple Active Complaints'],
            generatedAt: now
        });

        await Insight.create({
            citizenId: c2._id,
            riskScore: 'High',
            recommendation: 'URGENT ESCALATION: 1 Critical issue(s) unresolved and 1 SLA Breached / Overdue Grievance(s). Priority sanitation truck dispatch mandated.',
            riskFactors: ['1 Unresolved Critical Grievance', '1 Overdue SLA Breach'],
            generatedAt: now
        });

        await Insight.create({
            citizenId: c3._id,
            riskScore: 'Medium',
            recommendation: 'Monitoring required. Active High priority complaint in progress on road repairs.',
            riskFactors: ['1 Active High Priority Grievance'],
            generatedAt: now
        });

        await Insight.create({
            citizenId: c4._id,
            riskScore: 'Low',
            recommendation: 'Grievance filings within normal thresholds. Standard resolution workflow active.',
            riskFactors: ['No Critical Issues', 'Standard Resolution Timeline'],
            generatedAt: now
        });

        console.log('📜 Seeding System Audit Trail...');

        await AuditLog.create({
            userId: adminUser._id,
            action: 'System Initialization',
            details: 'Smart Citizen Grievance Portal database seeded with core accounts and sample civic grievances.',
            createdAt: past10Days
        });

        await AuditLog.create({
            userId: officer1._id,
            action: 'Update Grievance',
            details: `Changed grievance "${g1.title}" status from Open to In Progress.`,
            createdAt: past2Days
        });

        console.log('✅ Seeding completed successfully!');
        console.log('\n--- DEMO USER CREDENTIALS ---');
        console.log('🔑 Admin:   admin@grievance.gov.in    / Password123!');
        console.log('🔑 Manager: manager@grievance.gov.in  / Password123!');
        console.log('🔑 Officer: officer.sharma@grievance.gov.in / Password123!');
        console.log('🔑 Citizen: citizen.rajesh@gmail.com / Password123!');
        console.log('-------------------------------\n');

        process.exit(0);
    } catch (err) {
        console.error('Error during seeding:', err);
        process.exit(1);
    }
};

seedData();
