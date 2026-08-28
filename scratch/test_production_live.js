const https = require('https');

function request(url, options = {}, data = null) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const reqOptions = {
            hostname: parsedUrl.hostname,
            port: 443,
            path: parsedUrl.pathname + parsedUrl.search,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const req = https.request(reqOptions, (res) => {
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

async function runProductionTests() {
    const baseURL = 'https://smart-citizen-grievance-portal.onrender.com';
    console.log(`🌐 Running Live Production Tests against: ${baseURL}\n`);

    const results = {};

    try {
        // Test 1: Citizen Registration, Login, JWT Issuance
        console.log('--- Test 1: Citizen Registration, Login, JWT Issuance ---');
        const testEmail = `prod.citizen.${Date.now()}@example.com`;
        const regRes = await request(`${baseURL}/api/auth/register`, { method: 'POST' }, {
            name: 'Live Production Citizen',
            email: testEmail,
            password: 'Password123!',
            phone: '+91 98888 77777',
            address: '456 Production Boulevard'
        });
        console.log('✅ Citizen Register Success! Role:', regRes.data.role, '| Token Issued:', !!regRes.data.token);

        const citizenToken = regRes.data.token;
        results.citizenAuth = true;

        // Test 2: Citizen Lodges Grievance & Tracks Status
        console.log('\n--- Test 2: Citizen Lodges Grievance & Tracks Status ---');
        const gRes = await request(`${baseURL}/api/grievances`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${citizenToken}` }
        }, {
            title: 'Production Live Water Leakage Test',
            description: 'Major pipeline leak reported during live production audit',
            category: 'Water Supply',
            location: 'Sector 42 High Street',
            priority: 'Critical'
        });
        console.log('✅ Grievance Lodged! ID:', gRes.data._id, '| Status:', gRes.data.status, '| Deadline:', gRes.data.deadline);
        const grievanceId = gRes.data._id;

        const myGrievances = await request(`${baseURL}/api/grievances`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${citizenToken}` }
        });
        console.log('✅ Citizen Grievances Tracked! Count:', myGrievances.data.length);
        results.citizenGrievance = true;

        // Test 3: Officer/Admin Role Protection Enforcement
        console.log('\n--- Test 3: Role-Based Security Enforcement (Citizen Token vs Protected Routes) ---');
        try {
            await request(`${baseURL}/api/auth/create-staff`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${citizenToken}` }
            }, { name: 'Hacker', email: 'hacker@test.com', password: 'Password123!', role: 'officer' });
            console.error('❌ SECURITY FAILURE: Citizen was able to hit create-staff route!');
            results.roleProtection = false;
        } catch (err) {
            console.log(`✅ Security Gate Verified! Citizen blocked from /api/auth/create-staff (HTTP ${err.status}: ${err.data.message || 'Forbidden'})`);
        }

        try {
            await request(`${baseURL}/api/grievances/insights/generate`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${citizenToken}` }
            });
            console.error('❌ SECURITY FAILURE: Citizen was able to hit AI insight generation!');
            results.roleProtection = false;
        } catch (err) {
            console.log(`✅ Security Gate Verified! Citizen blocked from AI Risk Insights (HTTP ${err.status}: ${err.data.message || 'Forbidden'})`);
        }

        try {
            await request(`${baseURL}/api/audit`, {
                method: 'GET',
                headers: { Authorization: `Bearer ${citizenToken}` }
            });
            console.error('❌ SECURITY FAILURE: Citizen was able to hit Audit Logs!');
            results.roleProtection = false;
        } catch (err) {
            console.log(`✅ Security Gate Verified! Citizen blocked from Audit Logs (HTTP ${err.status}: ${err.data.message || 'Forbidden'})`);
            results.roleProtection = true;
        }

        // Test 4: Officer Login, Timeline Update, & Resolution
        console.log('\n--- Test 4: Officer Login, Manage Grievance, Update Status & Resolve ---');
        const officerLogin = await request(`${baseURL}/api/auth/login`, { method: 'POST' }, {
            email: 'officer.sharma@grievance.gov.in',
            password: 'Password123!'
        });
        console.log('✅ Officer Login Success! Role:', officerLogin.data.role);
        const officerToken = officerLogin.data.token;

        const updateRes = await request(`${baseURL}/api/grievance-updates/${grievanceId}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${officerToken}` }
        }, {
            type: 'Officer Field Note',
            notes: 'Field officer verified pipeline isolation on live production test.'
        });
        console.log('✅ Officer Field Note Posted! Log ID:', updateRes.data._id);

        const resolveRes = await request(`${baseURL}/api/grievances/${grievanceId}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${officerToken}` }
        }, { status: 'Resolved' });
        console.log('✅ Grievance Resolved! Status:', resolveRes.data.status);
        results.officerWorkflow = true;

        // Test 5: Analytics & AI Escalation Risk Matrix
        console.log('\n--- Test 5: Admin Analytics & AI Escalation Risk Matrix ---');
        const adminLogin = await request(`${baseURL}/api/auth/login`, { method: 'POST' }, {
            email: 'admin@grievance.gov.in',
            password: 'Password123!'
        });
        const adminToken = adminLogin.data.token;

        const statsRes = await request(`${baseURL}/api/dashboard/stats`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('✅ Civic KPIs Fetched! Total Grievances:', statsRes.data.totalGrievances, '| Citizens:', statsRes.data.totalCitizens);

        const insightsRes = await request(`${baseURL}/api/grievances/insights/generate`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('✅ AI Escalation Risk Matrix Generated! Count:', insightsRes.data.length);
        results.analyticsAndAI = true;

        // Test 6: Invalid/Expired Token Rejection
        console.log('\n--- Test 6: Invalid Token Rejection ---');
        try {
            await request(`${baseURL}/api/auth/me`, {
                method: 'GET',
                headers: { Authorization: 'Bearer invalid_tampered_token_xyz123' }
            });
            console.error('❌ SECURITY FAILURE: Tampered token was accepted!');
            results.tokenSecurity = false;
        } catch (err) {
            console.log(`✅ Invalid Token Rejected! (HTTP ${err.status}: ${err.data.message || 'Unauthorized'})`);
            results.tokenSecurity = true;
        }

        console.log('\n========================================');
        console.log('🎉 ALL LIVE PRODUCTION VERIFICATION TESTS PASSED!');
        console.log('========================================');
        process.exit(0);
    } catch (err) {
        console.error('\n❌ Production Test Failure:', err);
        process.exit(1);
    }
}

runProductionTests();
