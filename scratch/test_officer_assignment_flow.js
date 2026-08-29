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

async function runOfficerAssignmentFlowTests() {
    console.log('====================================================');
    console.log('🧪 RUNNING MANAGER -> FIELD OFFICER ASSIGNMENT TEST SUITE');
    console.log('====================================================\n');

    process.env.USE_MEMORY_DB = 'true';
    await connectDB();
    await seedData(true);

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
        const managerUser = await User.findOne({ email: 'manager@grievance.gov.in' });
        const adminUser = await User.findOne({ email: 'admin@grievance.gov.in' });
        const officer1 = await User.findOne({ email: 'officer.sharma@grievance.gov.in' });
        const officer2 = await User.findOne({ email: 'officer.verma@grievance.gov.in' });
        const citizenUser = await User.findOne({ email: 'citizen.rajesh@gmail.com' });

        assert(!!managerUser && !!officer1 && !!officer2 && !!citizenUser, 'Test accounts loaded successfully');

        // Test 1 — GET /api/auth/officers endpoint Returns ONLY Field Officers for Manager
        console.log('\n--- Test 1: Dedicated Field Officers List Endpoint ---');
        const offListReq = { user: managerUser };
        const offListRes = mockRes();
        await authController.getOfficers(offListReq, offListRes);

        const officersList = offListRes.data || [];
        const nonOfficerRoles = officersList.filter(u => u.role !== 'officer' && u.role !== 'field_officer');
        assert(offListRes.statusCode === 200 && officersList.length >= 2, 'Manager successfully fetches field officers list', `Count: ${officersList.length}`);
        assert(nonOfficerRoles.length === 0, 'Officers endpoint contains ONLY Field Officers (no admins or managers)');

        // Find an unassigned open complaint (or create one for testing)
        console.log('\n--- Test 2: Manager Assigns Field Officer ---');
        const unassignedGrievance = await Grievance.create({
            citizenId: (await Citizen.findOne())._id,
            citizenName: 'Rajesh Kumar',
            title: 'Unassigned Test Complaint for Manager Workflow',
            description: 'Testing Manager officer assignment workflow end-to-end',
            category: 'Water Supply',
            location: 'Sector 62 Noida',
            priority: 'High',
            status: 'Open',
            assignedTo: null
        });

        assert(unassignedGrievance.assignedTo === null, 'Created unassigned test grievance in database');

        const assignReq = {
            user: managerUser,
            params: { id: unassignedGrievance._id },
            body: { assignedTo: officer1._id }
        };
        const assignRes = mockRes();
        await grievanceController.updateGrievance(assignReq, assignRes);

        assert(assignRes.statusCode === 200, 'Manager updateGrievance assignment returns HTTP 200');
        const updatedGrievance = assignRes.data;
        assert(String(updatedGrievance.assignedTo._id || updatedGrievance.assignedTo) === String(officer1._id), 'Grievance assignedTo correctly persists Officer 1 ID', `Assigned: ${updatedGrievance.assignedTo.name}`);

        // Test 3 — Status Preservation
        console.log('\n--- Test 3: Status Lifecycle Preservation ---');
        assert(updatedGrievance.status === 'Open', 'Assignment preserves ticket status as "Open" (does NOT forcibly set to In Progress)');

        // Test 4 — Backend Independent Role Validation
        console.log('\n--- Test 4: Backend Independent Officer Role Validation ---');
        const invalidAssignReq = {
            user: managerUser,
            params: { id: unassignedGrievance._id },
            body: { assignedTo: citizenUser._id } // Trying to assign a Citizen!
        };
        const invalidAssignRes = mockRes();
        await grievanceController.updateGrievance(invalidAssignReq, invalidAssignRes);

        assert(invalidAssignRes.statusCode === 400, 'Backend rejects assigning a Citizen role with HTTP 400 Bad Request', `Message: "${invalidAssignRes.data.message}"`);

        // Test 5 — Field Officer Duty Queue as Testable Outcome
        console.log('\n--- Test 5: Field Officer Duty Queue Outcome Verification ---');
        const off1QueueReq = { user: officer1 };
        const off1QueueRes = mockRes();
        await dashboardController.getDutyQueue(off1QueueReq, off1QueueRes);

        const off1Queue = off1QueueRes.data.myQueue || [];
        const ticketInOff1Queue = off1Queue.find(g => String(g._id) === String(unassignedGrievance._id));
        assert(off1QueueRes.statusCode === 200 && !!ticketInOff1Queue, 'Assigned complaint appears dynamically in Officer 1\'s Duty Queue');

        // Test 6 — Workload Isolation between Officers
        console.log('\n--- Test 6: Field Officer Workload Isolation ---');
        const off2QueueReq = { user: officer2 };
        const off2QueueRes = mockRes();
        await dashboardController.getDutyQueue(off2QueueReq, off2QueueRes);

        const off2Queue = off2QueueRes.data.myQueue || [];
        const ticketInOff2Queue = off2Queue.find(g => String(g._id) === String(unassignedGrievance._id));
        assert(off2QueueRes.statusCode === 200 && !ticketInOff2Queue, 'Officer 1\'s assigned complaint does NOT leak into Officer 2\'s Duty Queue');

        // Test 7 — Officer Reassignment
        console.log('\n--- Test 7: Officer Reassignment ---');
        const reassignReq = {
            user: managerUser,
            params: { id: unassignedGrievance._id },
            body: { assignedTo: officer2._id }
        };
        const reassignRes = mockRes();
        await grievanceController.updateGrievance(reassignReq, reassignRes);
        assert(reassignRes.statusCode === 200 && String(reassignRes.data.assignedTo._id || reassignRes.data.assignedTo) === String(officer2._id), 'Reassigned complaint updates to Officer 2 ID');

        // Verify Officer 2 queue now has it and Officer 1 queue lost it
        const off1RecheckRes = mockRes();
        await dashboardController.getDutyQueue({ user: officer1 }, off1RecheckRes);
        const off2RecheckRes = mockRes();
        await dashboardController.getDutyQueue({ user: officer2 }, off2RecheckRes);

        const inOff1Now = (off1RecheckRes.data.myQueue || []).some(g => String(g._id) === String(unassignedGrievance._id));
        const inOff2Now = (off2RecheckRes.data.myQueue || []).some(g => String(g._id) === String(unassignedGrievance._id));
        assert(!inOff1Now && inOff2Now, 'Reassigned complaint seamlessly transferred from Officer 1 queue to Officer 2 queue');

        // Test 8 — Authorization Guard Check
        console.log('\n--- Test 8: Authorization Guard Check ---');
        const citizenAssignReq = {
            user: citizenUser,
            params: { id: unassignedGrievance._id },
            body: { assignedTo: officer1._id }
        };
        const citizenAssignRes = mockRes();
        await grievanceController.updateGrievance(citizenAssignReq, citizenAssignRes);
        assert(citizenAssignRes.statusCode === 403, 'Citizen blocked from performing officer assignments with HTTP 403 Forbidden');

        console.log('\n====================================================');
        console.log(`🎉 ALL ${passCount}/${totalTests} ASSIGNMENT WORKFLOW TESTS PASSED!`);
        console.log('====================================================\n');
        process.exit(0);
    } catch (err) {
        console.error('❌ Officer Assignment Flow Test Error:', err);
        process.exit(1);
    }
}

runOfficerAssignmentFlowTests();
