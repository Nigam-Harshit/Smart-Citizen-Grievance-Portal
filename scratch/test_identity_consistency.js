const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('../config/db');
const seedData = require('../seed');
const User = require('../models/User');
const Citizen = require('../models/Citizen');
const Grievance = require('../models/Grievance');

const authController = require('../controllers/authController');
const grievanceController = require('../controllers/grievanceController');
const { consolidateCitizenIdentities } = require('../utils/identityHelper');

function mockRes() {
    return {
        statusCode: 200,
        data: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.data = payload;
            return this;
        }
    };
}

async function runIdentityConsistencyTests() {
    console.log('====================================================');
    console.log('🧪 RUNNING CANONICAL IDENTITY CONSISTENCY TEST SUITE');
    console.log('====================================================\n');

    process.env.USE_MEMORY_DB = 'true';
    await connectDB();
    await seedData(true);
    await consolidateCitizenIdentities();

    let passCount = 0;
    let totalTests = 0;

    function assert(condition, title, details = '') {
        totalTests++;
        if (condition) {
            console.log(`  ✅ TEST ${totalTests}: ${title} ${details ? `(${details})` : ''}`);
            passCount++;
        } else {
            console.error(`  ❌ TEST ${totalTests} FAILED: ${title} ${details ? `(${details})` : ''}`);
        }
    }

    try {
        // Find Rajesh's user and canonical citizen profile
        const rajeshUser = await User.findOne({ email: 'citizen.rajesh@gmail.com' });
        const rajeshCitizen = await Citizen.findOne({ email: 'citizen.rajesh@gmail.com' });
        const adminUser = await User.findOne({ email: 'admin@grievance.gov.in' });

        assert(!!rajeshUser && !!rajeshCitizen, 'Rajesh User and Citizen records exist');
        assert(String(rajeshUser.linkedCitizenId) === String(rajeshCitizen._id) && String(rajeshCitizen.linkedUserId) === String(rajeshUser._id), 'Bi-directional canonical linkage verified between User and Citizen records');

        // Test 1 — Citizen complaint count (Citizen Dashboard view)
        console.log('\n--- Test 1: Citizen Dashboard Data Retrieval ---');
        const citizenDashboardReq = { user: rajeshUser, query: {} };
        const citizenDashboardRes = mockRes();
        await grievanceController.getGrievances(citizenDashboardReq, citizenDashboardRes);

        const citizenDashboardGrievances = citizenDashboardRes.data || [];
        const citizenTotalFiled = citizenDashboardGrievances.length;
        assert(citizenDashboardRes.statusCode === 200 && citizenTotalFiled > 0, 'Citizen Dashboard returns grievances dynamically', `Count: ${citizenTotalFiled}`);

        // Test 2 — Admin citizen profile count
        console.log('\n--- Test 2: Admin Citizen Profile Data Retrieval ---');
        const adminProfileReq = { user: adminUser, query: { citizenId: rajeshCitizen._id } };
        const adminProfileRes = mockRes();
        await grievanceController.getGrievances(adminProfileReq, adminProfileRes);

        const adminProfileGrievances = adminProfileRes.data || [];
        const adminTotalFiled = adminProfileGrievances.length;
        assert(adminProfileRes.statusCode === 200, 'Admin Citizen Profile request returns HTTP 200');
        assert(citizenTotalFiled === adminTotalFiled, 'Citizen Dashboard count matches Admin Citizen Profile count EXACTLY', `Dashboard: ${citizenTotalFiled}, Admin Profile: ${adminTotalFiled}`);

        // Test 3 — Status aggregation
        console.log('\n--- Test 3: Status Aggregation Integrity ---');
        const openCount = citizenDashboardGrievances.filter(g => g.status === 'Open').length;
        const inProgressCount = citizenDashboardGrievances.filter(g => g.status === 'In Progress').length;
        const resolvedCount = citizenDashboardGrievances.filter(g => g.status === 'Resolved').length;

        const sumStatus = openCount + inProgressCount + resolvedCount;
        assert(sumStatus === citizenTotalFiled, 'Status aggregation rule holds true (open + inProgress + resolved === totalFiled)', `${openCount} open + ${inProgressCount} inProgress + ${resolvedCount} resolved === ${citizenTotalFiled}`);

        // Test 4 — Master grievances global set relationship
        console.log('\n--- Test 4: Master Grievance Tracker Global Set ---');
        const masterReq = { user: adminUser, query: {} };
        const masterRes = mockRes();
        await grievanceController.getGrievances(masterReq, masterRes);

        const masterGrievances = masterRes.data || [];
        const masterTotal = masterGrievances.length;
        assert(masterTotal >= citizenTotalFiled, 'Master Grievances count is >= Rajesh complaint count', `Master Total: ${masterTotal}, Rajesh Total: ${citizenTotalFiled}`);

        const rajeshInMaster = masterGrievances.filter(g => String(g.citizenId?._id || g.citizenId) === String(rajeshCitizen._id));
        assert(rajeshInMaster.length === citizenTotalFiled, 'All Rajesh grievances belong to Master Grievance Tracker without leaking or omission', `Found in Master: ${rajeshInMaster.length}`);

        // Test 5 — Identity integrity upon lodging a new complaint
        console.log('\n--- Test 5: Dynamic Creation Consistency ---');
        const newGrievanceReq = {
            user: rajeshUser,
            body: {
                title: 'New Dynamic Verification Complaint',
                description: 'Verifying canonical identity persistence across citizen dashboard and admin profile',
                category: 'Sanitation',
                location: 'Sector 62 Noida',
                priority: 'High'
            }
        };
        const newGrievanceRes = mockRes();
        await grievanceController.createGrievance(newGrievanceReq, newGrievanceRes);
        assert(newGrievanceRes.statusCode === 201, 'New grievance created successfully via API');

        // Re-check Dashboard and Admin Profile
        const postDashRes = mockRes();
        await grievanceController.getGrievances({ user: rajeshUser, query: {} }, postDashRes);

        const postAdminRes = mockRes();
        await grievanceController.getGrievances({ user: adminUser, query: { citizenId: rajeshCitizen._id } }, postAdminRes);

        assert(postDashRes.data.length === citizenTotalFiled + 1, 'Citizen Dashboard dynamically reflects incremented count', `New count: ${postDashRes.data.length}`);
        assert(postAdminRes.data.length === citizenTotalFiled + 1, 'Admin Citizen Profile dynamically reflects incremented count', `New count: ${postAdminRes.data.length}`);

        // Test 6 — Multi-tenant Citizen Isolation
        console.log('\n--- Test 6: Multi-tenant Citizen Data Isolation ---');
        const priyaCitizen = await Citizen.findOne({ email: 'priya.patel@yahoo.in' });
        assert(!!priyaCitizen, 'Second test citizen (Priya Patel) exists');

        const priyaAdminRes = mockRes();
        await grievanceController.getGrievances({ user: adminUser, query: { citizenId: priyaCitizen._id } }, priyaAdminRes);

        const priyaGrievances = priyaAdminRes.data || [];
        const rajeshInPriya = priyaGrievances.filter(g => String(g.citizenId?._id || g.citizenId) === String(rajeshCitizen._id));
        assert(rajeshInPriya.length === 0, 'No Rajesh grievances leak into Priya Patel\'s Citizen Profile', `Leak count: ${rajeshInPriya.length}`);

        console.log('\n====================================================');
        console.log(`🎉 ALL ${passCount}/${totalTests} IDENTITY CONSISTENCY TESTS PASSED!`);
        console.log('====================================================\n');
        process.exit(0);
    } catch (err) {
        console.error('❌ Identity Consistency Test Error:', err);
        process.exit(1);
    }
}

runIdentityConsistencyTests();
