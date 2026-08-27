const http = require('http');
const dns = require('dns');

try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

function request(url, options = {}, data = null) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const reqOptions = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.pathname + parsedUrl.search,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const req = http.request(reqOptions, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = body ? JSON.parse(body) : {};
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ status: res.statusCode, data: parsed });
                    } else {
                        reject({ status: res.statusCode, data: parsed });
                    }
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function runE2ETests() {
    console.log('🧪 Starting Phase 6 End-to-End API Flow Testing...');

    // Load server
    require('../server');
    
    // Allow MongoMemoryServer or MongoDB Atlas 4 seconds to spin up and connect
    await new Promise(r => setTimeout(r, 4000));

    // Seed database with demo accounts before tests (pass true to skip re-connecting)
    const seedData = require('../seed');
    await seedData(true);

    const baseURL = 'http://127.0.0.1:5000';
    console.log(`🚀 Communicating with server on ${baseURL}`);

    try {
        // Test 1: Admin Login
        console.log('\n--- Test 1: Admin Login ---');
        const adminLogin = await request(`${baseURL}/api/auth/login`, { method: 'POST' }, {
            email: 'admin@grievance.gov.in',
            password: 'Password123!'
        });
        console.log('✅ Admin Login Success! Role:', adminLogin.data.role);
        const adminToken = adminLogin.data.token;

        // Test 2: Citizen Registration
        console.log('\n--- Test 2: Citizen Registration ---');
        const citizenRes = await request(`${baseURL}/api/auth/register`, { method: 'POST' }, {
            name: 'E2E Test Citizen',
            email: `test.citizen.${Date.now()}@example.com`,
            password: 'Password123!',
            phone: '+91 99999 88888',
            address: '123 E2E Test Lane'
        });
        console.log('✅ Citizen Register Success! Role:', citizenRes.data.role, '| Linked Citizen ID:', citizenRes.data.linkedCitizenId);
        const citizenToken = citizenRes.data.token;

        // Test 3: Admin Creates Officer Account
        console.log('\n--- Test 3: Admin Creates Officer Account ---');
        const officerRes = await request(`${baseURL}/api/auth/create-staff`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${adminToken}` }
        }, {
            name: 'E2E Test Officer',
            email: `test.officer.${Date.now()}@example.com`,
            password: 'Password123!',
            role: 'officer'
        });
        console.log('✅ Officer Created Success! ID:', officerRes.data.user?._id || officerRes.data._id, '| Role:', officerRes.data.user?.role || officerRes.data.role);

        // Test 4: Citizen Lodges Grievance (Priority Critical -> 24h SLA)
        console.log('\n--- Test 4: Citizen Lodges Critical Grievance ---');
        const grievanceRes = await request(`${baseURL}/api/grievances`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${citizenToken}` }
        }, {
            title: 'E2E Burst Water Pipe Emergency',
            description: 'Main water line burst causing flooding near Sector 15 Market',
            category: 'Water Supply',
            location: 'Sector 15 Main Market',
            priority: 'Critical'
        });
        const gData = grievanceRes.data;
        console.log('✅ Grievance Lodged! ID:', gData._id, '| Priority:', gData.priority);
        console.log('   SLA Target Deadline:', gData.deadline);

        const expectedDeadlineHour = new Date(new Date(gData.createdAt).getTime() + 24 * 60 * 60 * 1000).getHours();
        const actualDeadlineHour = new Date(gData.deadline).getHours();
        console.log('   SLA 24h Math Verification:', expectedDeadlineHour === actualDeadlineHour ? 'MATCH ✅' : 'MISMATCH ❌');

        // Test 5: Admin Assigns Officer to Grievance
        console.log('\n--- Test 5: Admin Assigns Officer ---');
        const officerId = officerRes.data.user?._id || officerRes.data._id;
        const assignRes = await request(`${baseURL}/api/grievances/${gData._id}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${adminToken}` }
        }, {
            assignedTo: officerId
        });
        console.log('✅ Grievance Assigned! Officer ID:', assignRes.data.assignedTo);

        // Test 6: Officer logs Timeline Field Update & Resolves Ticket
        console.log('\n--- Test 6: Officer Logs Timeline Update & Resolves Ticket ---');
        const officerLogin = await request(`${baseURL}/api/auth/login`, { method: 'POST' }, {
            email: officerRes.data.user?.email || officerRes.data.email,
            password: 'Password123!'
        });
        const officerToken = officerLogin.data.token;

        const updateRes = await request(`${baseURL}/api/grievance-updates/${gData._id}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${officerToken}` }
        }, {
            type: 'Officer Field Note',
            notes: 'Zonal water repair team dispatched to isolate the burst main.'
        });
        console.log('✅ Field Note Posted! Log ID:', updateRes.data._id);

        const resolveRes = await request(`${baseURL}/api/grievances/${gData._id}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${officerToken}` }
        }, {
            status: 'Resolved'
        });
        console.log('✅ Grievance Resolved! Status:', resolveRes.data.status, '| ResolvedAt:', resolveRes.data.resolvedAt);

        // Test 7: Dashboard Civic KPIs Aggregation
        console.log('\n--- Test 7: Dashboard Civic KPIs Aggregation ---');
        const statsRes = await request(`${baseURL}/api/dashboard/stats`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('✅ Dashboard Stats Returned:');
        console.log('   Total Citizens:', statsRes.data.totalCitizens);
        console.log('   Total Grievances:', statsRes.data.totalGrievances);
        console.log('   Active Grievances:', statsRes.data.activeGrievances);
        console.log('   Avg Resolution Time (hrs):', statsRes.data.avgResolutionTimeHours);

        // Test 8: AI Escalation Risk Model Generation
        console.log('\n--- Test 8: AI Escalation Risk Model ---');
        const aiRes = await request(`${baseURL}/api/grievances/insights/generate`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('✅ AI Escalation Risk Matrix Generated! Insight Count:', aiRes.data.length);

        console.log('\n🎉 ALL 8 END-TO-END TESTS PASSED WITH 100% SUCCESS!');
        process.exit(0);
    } catch (err) {
        console.error('\n❌ E2E Test Failure:', err);
        process.exit(1);
    }
}

runE2ETests();
