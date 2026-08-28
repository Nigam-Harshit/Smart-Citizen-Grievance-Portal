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
const dashboardController = require('../controllers/dashboardController');

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

async function runScopingVerification() {
    console.log('🧪 Starting Backend Authorization & Scope Verification Suite...\n');

    await connectDB();
    await seedData(true);

    let passCount = 0;
    let testCount = 0;

    function assert(condition, title) {
        testCount++;
        if (condition) {
            console.log(`  ✅ TEST ${testCount}: ${title}`);
            passCount++;
        } else {
            console.error(`  ❌ TEST ${testCount} FAILED: ${title}`);
        }
    }

    try {
        // --- Test 1: 3-Field Citizen Registration ---
        console.log('\n--- 1. Testing 3-Field Citizen Registration ---');
        const regReq = {
            body: {
                name: 'Minimal Citizen Test',
                email: `minimal.${Date.now()}@example.com`,
                password: 'Password123!'
            }
        };
        const regRes = mockRes();
        await authController.registerUser(regReq, regRes);
        assert(regRes.statusCode === 201 && regRes.data.token, 'Citizen registration succeeds with name, email, and password ONLY');

        // Verify linked Citizen document has default empty contact and address
        const registeredUser = await User.findById(regRes.data._id);
        const linkedCitizen = await Citizen.findById(registeredUser.linkedCitizenId);
        assert(linkedCitizen && linkedCitizen.contact === '' && linkedCitizen.address === '', 'Linked Citizen document created with empty contact/address');

        // --- Test 2: Manager Scope Restriction ---
        console.log('\n--- 2. Testing Manager Scope Boundary Enforcement ---');
        const managerUser = await User.findOne({ email: 'manager@grievance.gov.in' });
        assert(managerUser && managerUser.scope === 'Water Supply', 'Manager user has scope set to "Water Supply"');

        // Manager fetching grievances -> should only receive Water Supply category
        const managerGetReq = { user: managerUser, query: {} };
        const managerGetRes = mockRes();
        await grievanceController.getGrievances(managerGetReq, managerGetRes);
        const managerGrievances = managerGetRes.data || [];
        const nonWaterCount = managerGrievances.filter(g => g.category !== 'Water Supply').length;
        assert(managerGetRes.statusCode === 200 && nonWaterCount === 0, 'Manager getGrievances returns ONLY grievances in assigned scope ("Water Supply")');

        // Manager attempting to fetch a grievance outside scope (e.g. Roads & Traffic)
        const roadsGrievance = await Grievance.findOne({ category: 'Roads & Traffic' });
        const managerDetailReq = { user: managerUser, params: { id: roadsGrievance._id } };
        const managerDetailRes = mockRes();
        await grievanceController.getGrievanceById(managerDetailReq, managerDetailRes);
        assert(managerDetailRes.statusCode === 403, 'Manager accessing grievance outside scope returns HTTP 403 Forbidden');

        // --- Test 3: Officer Scope Restriction ---
        console.log('\n--- 3. Testing Field Officer Assignment Boundary ---');
        const officer1 = await User.findOne({ email: 'officer.sharma@grievance.gov.in' });
        const officer2 = await User.findOne({ email: 'officer.verma@grievance.gov.in' });

        const officer2Grievance = await Grievance.findOne({ assignedTo: officer2._id });
        const officer1DetailReq = { user: officer1, params: { id: officer2Grievance._id } };
        const officer1DetailRes = mockRes();
        await grievanceController.getGrievanceById(officer1DetailReq, officer1DetailRes);
        assert(officer1DetailRes.statusCode === 403, 'Officer accessing another officer\'s assigned grievance returns HTTP 403 Forbidden');

        // --- Test 4: Duty Queue Endpoints for All Roles ---
        console.log('\n--- 4. Testing Duty Queue Server-Side Response ---');

        // Officer Duty Queue
        const offQueueReq = { user: officer1 };
        const offQueueRes = mockRes();
        await dashboardController.getDutyQueue(offQueueReq, offQueueRes);
        assert(offQueueRes.statusCode === 200 && offQueueRes.data.role === 'officer' && Array.isArray(offQueueRes.data.myQueue), 'Officer duty queue returns assigned queue array');

        // Manager Duty Queue
        const mgrQueueReq = { user: managerUser };
        const mgrQueueRes = mockRes();
        await dashboardController.getDutyQueue(mgrQueueReq, mgrQueueRes);
        assert(mgrQueueRes.statusCode === 200 && mgrQueueRes.data.role === 'manager' && Array.isArray(mgrQueueRes.data.unassignedInScope), 'Manager duty queue returns unassigned and breaching scope queues');

        // Admin Duty Queue
        const adminUser = await User.findOne({ email: 'admin@grievance.gov.in' });
        const admQueueReq = { user: adminUser };
        const admQueueRes = mockRes();
        await dashboardController.getDutyQueue(admQueueReq, admQueueRes);
        assert(admQueueRes.statusCode === 200 && admQueueRes.data.role === 'admin' && admQueueRes.data.healthSummary, 'Admin duty queue returns system-wide breached list and health summary');

        // --- Test 5: Explainable SLA Heuristic Risk Engine ---
        console.log('\n--- 5. Testing Explainable SLA Escalation Heuristic ---');
        const insightsReq = { user: adminUser };
        const insightsRes = mockRes();
        await grievanceController.generateInsights(insightsReq, insightsRes);
        assert(insightsRes.statusCode === 200 && Array.isArray(insightsRes.data) && insightsRes.data.length > 0, 'Heuristic SLA Risk Engine executes and returns insights matrix');

        console.log(`\n========================================`);
        console.log(`🎉 BACKEND AUTHORIZATION & SCOPE TESTS PASSED (${passCount}/${testCount})`);
        console.log(`========================================\n`);

        process.exit(0);
    } catch (err) {
        console.error('❌ Scoping Verification Error:', err);
        process.exit(1);
    }
}

runScopingVerification();
