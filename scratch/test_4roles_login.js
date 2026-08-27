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

async function test4RolesLogin() {
    console.log('🧪 Testing 4-Role Authentication & Data Access...');

    require('../server');
    await new Promise(r => setTimeout(r, 3500));

    const baseURL = 'http://127.0.0.1:5000';

    const credentials = [
        { roleName: 'Admin', email: 'admin@grievance.gov.in', password: 'Password123!' },
        { roleName: 'Manager', email: 'manager@grievance.gov.in', password: 'Password123!' },
        { roleName: 'Officer', email: 'officer.sharma@grievance.gov.in', password: 'Password123!' },
        { roleName: 'Citizen', email: 'citizen.rajesh@gmail.com', password: 'Password123!' }
    ];

    for (const cred of credentials) {
        try {
            const loginRes = await request(`${baseURL}/api/auth/login`, { method: 'POST' }, {
                email: cred.email,
                password: cred.password
            });
            console.log(`\n✅ ${cred.roleName} Login Verified!`);
            console.log(`   User: ${loginRes.data.name} | Role: ${loginRes.data.role}`);

            const token = loginRes.data.token;
            const grievancesRes = await request(`${baseURL}/api/grievances`, {
                method: 'GET',
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`   Fetched Grievances Count: ${grievancesRes.data.length}`);
        } catch (err) {
            console.error(`❌ ${cred.roleName} Login Failed:`, err);
            process.exit(1);
        }
    }

    console.log('\n🎉 ALL 4 ROLES AUTHENTICATED & DATA VERIFIED SUCCESSFULLY!');
    process.exit(0);
}

test4RolesLogin();
