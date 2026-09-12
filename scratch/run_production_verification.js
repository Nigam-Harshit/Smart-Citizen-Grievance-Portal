const https = require('https');

const API_BASE = 'https://smart-citizen-grievance-portal.onrender.com';

function request(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        let parsed = body;
        try {
          parsed = JSON.parse(body);
        } catch (e) {}
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    req.on('error', (err) => reject(err));

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runProductionE2EVerification() {
  console.log('🌐 STARTING COMPLETE PRODUCTION E2E VERIFICATION SUITE\n');

  const report = {};

  // Phase 1: API Sanity Check
  console.log('--- Phase 1: Production API Sanity Check ---');
  const sanity = await request('GET', '/');
  console.log(`GET / Status: ${sanity.status}`);
  console.log(`GET / Body: ${typeof sanity.body === 'string' ? sanity.body.trim() : JSON.stringify(sanity.body)}`);
  report.phase1 = sanity.status === 200;

  // Phase 3: Citizen Login
  console.log('\n--- Phase 3: Citizen Login ---');
  const citizenAuth = await request('POST', '/api/auth/login', {
    email: 'citizen.rajesh@gmail.com',
    password: 'Password123!',
  });
  console.log(`Citizen Login Status: ${citizenAuth.status}`);
  const citizenToken = citizenAuth.body?.token;
  const citizenRole = citizenAuth.body?.role;
  const citizenName = citizenAuth.body?.name;
  console.log(`Citizen User Name: ${citizenName}, Role: ${citizenRole}`);
  report.phase3 = citizenAuth.status === 200 && citizenRole === 'citizen' && !!citizenToken;

  // Phase 4: Grievance Creation Contract Test (6 Categories)
  console.log('\n--- Phase 4: Grievance Creation Contract Test (All 6 Categories) ---');
  const categories = ['Sanitation', 'Roads & Traffic', 'Water Supply', 'Electricity', 'Public Safety', 'Other'];
  const createdGrievances = [];
  let p4Success = true;

  for (const cat of categories) {
    const res = await request('POST', '/api/grievances', {
      title: `E2E Test Complaint - ${cat}`,
      description: `Automated end-to-end production verification for category ${cat}`,
      category: cat,
      location: `Sector 15, Test Zone ${cat}`,
      priority: 'Medium',
    }, citizenToken);

    console.log(`Category "${cat}" -> Status: ${res.status}, ID: ${res.body?._id}`);
    if (res.status === 201 && res.body?.category === cat) {
      createdGrievances.push(res.body);
    } else {
      p4Success = false;
      console.error(`❌ Category ${cat} failed:`, res.body);
    }
  }
  report.phase4 = p4Success;

  // Phase 5: Priority Contract Test (4 Priorities)
  console.log('\n--- Phase 5: Priority Contract Test (All 4 Priorities) ---');
  const priorities = ['Low', 'Medium', 'High', 'Critical'];
  let p5Success = true;

  for (const prio of priorities) {
    const res = await request('POST', '/api/grievances', {
      title: `Priority Test Complaint - ${prio}`,
      description: `Automated end-to-end production verification for priority ${prio}`,
      category: 'Roads & Traffic',
      location: 'Main Highway Gate 4',
      priority: prio,
    }, citizenToken);

    console.log(`Priority "${prio}" -> Status: ${res.status}, ID: ${res.body?._id}, Priority: ${res.body?.priority}`);
    if (res.status === 201 && res.body?.priority === prio) {
      createdGrievances.push(res.body);
    } else {
      p5Success = false;
      console.error(`❌ Priority ${prio} failed:`, res.body);
    }
  }
  report.phase5 = p5Success;

  // Phase 6: Invalid Input / Validation Test
  console.log('\n--- Phase 6: Invalid Input / Validation Test ---');
  const invalidRes = await request('POST', '/api/grievances', {
    title: 'Huge Pothole',
    description: 'Testing obsolete invalid category enum',
    category: 'Roads',
    location: 'at School Road',
    priority: 'Critical',
  }, citizenToken);

  console.log(`Invalid Category "Roads" -> Status: ${invalidRes.status}`);
  console.log(`Response Body:`, JSON.stringify(invalidRes.body));
  report.phase6 = invalidRes.status === 400 && invalidRes.body?.message?.includes('Roads');

  // Phase 7: Citizen History & Detail View
  console.log('\n--- Phase 7: Citizen History & Detail Verification ---');
  const myGrievancesRes = await request('GET', '/api/grievances', null, citizenToken);
  console.log(`GET /api/grievances Status: ${myGrievancesRes.status}, Count: ${myGrievancesRes.body?.length}`);
  
  const targetId = createdGrievances[0]?._id;
  const detailRes = await request('GET', `/api/grievances/${targetId}`, null, citizenToken);
  console.log(`GET /api/grievances/${targetId} Status: ${detailRes.status}, Title: "${detailRes.body?.title}", Category: "${detailRes.body?.category}"`);
  report.phase7 = myGrievancesRes.status === 200 && detailRes.status === 200 && detailRes.body?.category === createdGrievances[0]?.category;

  // Phase 8: Field Officer Workflow
  console.log('\n--- Phase 8: Field Officer Workflow ---');
  const officerAuth = await request('POST', '/api/auth/login', {
    email: 'officer.sharma@grievance.gov.in',
    password: 'Password123!',
  });
  console.log(`Officer Login Status: ${officerAuth.status}, User: ${officerAuth.body?.name}, Role: ${officerAuth.body?.role}`);
  const officerToken = officerAuth.body?.token;
  const officerId = officerAuth.body?._id;

  // Post Officer Field Note
  const updateRes = await request('POST', `/api/grievance-updates/${targetId}`, {
    type: 'Officer Field Note',
    notes: 'Inspected site on School Road. Repairs scheduled for morning hours.',
  }, officerToken);
  console.log(`Post Officer Note Status: ${updateRes.status}, Note Type: ${updateRes.body?.type}`);

  // Officer view assigned queue
  const officerDutyRes = await request('GET', '/api/dashboard/duty-queue', null, officerToken);
  console.log(`Officer Duty Queue Status: ${officerDutyRes.status}, Role: ${officerDutyRes.body?.role}, Count: ${officerDutyRes.body?.myQueueCount}`);
  report.phase8 = updateRes.status === 201 && officerDutyRes.status === 200;

  // Phase 9: Citizen Update Visibility
  console.log('\n--- Phase 9: Citizen Update Visibility ---');
  const reCheckGrievance = await request('GET', `/api/grievances/${targetId}`, null, citizenToken);
  const timelineRes = await request('GET', `/api/grievance-updates/${targetId}`, null, citizenToken);
  console.log(`Re-check Grievance Status: ${reCheckGrievance.body?.status}`);
  console.log(`Timeline Log Count: ${timelineRes.body?.length}, Latest Note: "${timelineRes.body?.[0]?.notes}"`);
  report.phase9 = timelineRes.body?.length > 0 && timelineRes.body?.[0]?.notes?.includes('Inspected site');

  // Phase 10: Manager Workflow & Jurisdiction Boundaries
  console.log('\n--- Phase 10: Manager Workflow & Jurisdiction Scope ---');
  const managerAuth = await request('POST', '/api/auth/login', {
    email: 'manager@grievance.gov.in',
    password: 'Password123!',
  });
  console.log(`Manager Login Status: ${managerAuth.status}, Scope: ${managerAuth.body?.scope}`);
  const managerToken = managerAuth.body?.token;

  const managerGrievances = await request('GET', '/api/grievances', null, managerToken);
  console.log(`Manager GET /api/grievances Status: ${managerGrievances.status}, Scoped Count: ${managerGrievances.body?.length}`);
  
  // Test manager accessing grievance outside scope
  const outOfScopeGrievance = createdGrievances.find((g) => g.category !== managerAuth.body?.scope);
  let scopeEnforced = false;
  if (outOfScopeGrievance) {
    const outOfScopeRes = await request('GET', `/api/grievances/${outOfScopeGrievance._id}`, null, managerToken);
    console.log(`Manager Out-of-Scope GET Status: ${outOfScopeRes.status}, Message: "${outOfScopeRes.body?.message}"`);
    scopeEnforced = outOfScopeRes.status === 403;
  }
  report.phase10 = managerGrievances.status === 200 && scopeEnforced;

  // Phase 11: Admin Workflow
  console.log('\n--- Phase 11: Admin Workflow ---');
  const adminAuth = await request('POST', '/api/auth/login', {
    email: 'admin@grievance.gov.in',
    password: 'Password123!',
  });
  console.log(`Admin Login Status: ${adminAuth.status}, Role: ${adminAuth.body?.role}`);
  const adminToken = adminAuth.body?.token;

  const adminStats = await request('GET', '/api/dashboard/stats', null, adminToken);
  console.log(`Admin Stats Status: ${adminStats.status}, Total Grievances: ${adminStats.body?.totalGrievances}`);
  report.phase11 = adminStats.status === 200 && adminStats.body?.totalGrievances > 0;

  // Phase 12: Role Authorization Boundaries
  console.log('\n--- Phase 12: Role Authorization Boundary Checks ---');
  const citizenAdminAttempt = await request('GET', '/api/dashboard/stats', null, citizenToken);
  console.log(`Citizen Accessing Admin Stats Status: ${citizenAdminAttempt.status}`);
  report.phase12 = citizenAdminAttempt.status === 403 || citizenAdminAttempt.status === 401;

  console.log('\n========================================');
  console.log('VERIFICATION SUMMARY REPORT:');
  console.log(JSON.stringify(report, null, 2));
  console.log('========================================\n');
}

runProductionE2EVerification().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});
