const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');
const Citizen = require('../models/Citizen');
const Grievance = require('../models/Grievance');
const grievanceController = require('../controllers/grievanceController');

async function runContractTest() {
  console.log('🧪 Starting Grievance Category Contract Verification...');

  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  const citizenUser = await User.create({
    name: 'Test Citizen',
    email: 'test.citizen@example.com',
    password: 'Password123!',
    role: 'citizen',
  });

  const citizenDoc = await Citizen.create({
    name: 'Test Citizen',
    email: 'test.citizen@example.com',
    linkedUserId: citizenUser._id,
  });

  // Mock req and res objects
  const mockRes = () => {
    const res = {};
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data) => {
      res.body = data;
      return res;
    };
    return res;
  };

  // TEST 1: Sending invalid "Roads" category
  const invalidReq = {
    user: citizenUser,
    body: {
      title: 'Huge Pothole',
      description: 'Could be fatal as it a heavy traffic area !',
      category: 'Roads',
      location: 'at School Road',
      priority: 'Critical',
    },
  };
  const res1 = mockRes();
  await grievanceController.createGrievance(invalidReq, res1);

  console.log(`\n--- Test 1: Invalid "Roads" Category Payload ---`);
  console.log(`  Response Status Code: ${res1.statusCode}`);
  console.log(`  Response Body:`, JSON.stringify(res1.body));
  if (res1.statusCode === 400 && res1.body.message.includes('Roads')) {
    console.log('  ✅ TEST 1 PASSED: Mongoose validation rejected "Roads" with HTTP 400 Bad Request.');
  } else {
    console.error('  ❌ TEST 1 FAILED!');
    process.exit(1);
  }

  // TEST 2: Sending canonical "Roads & Traffic" category
  const validReq = {
    user: citizenUser,
    body: {
      title: 'Huge Pothole',
      description: 'Could be fatal as it a heavy traffic area !',
      category: 'Roads & Traffic',
      location: 'at School Road',
      priority: 'Critical',
    },
  };
  const res2 = mockRes();
  await grievanceController.createGrievance(validReq, res2);

  console.log(`\n--- Test 2: Canonical "Roads & Traffic" Category Payload ---`);
  console.log(`  Response Status Code: ${res2.statusCode}`);
  console.log(`  Created Grievance ID: ${res2.body._id}`);
  console.log(`  Created Grievance Category: ${res2.body.category}`);
  if (res2.statusCode === 201 && res2.body.category === 'Roads & Traffic') {
    console.log('  ✅ TEST 2 PASSED: Grievance created successfully with HTTP 201 Created!');
  } else {
    console.error('  ❌ TEST 2 FAILED!');
    process.exit(1);
  }

  await mongoose.disconnect();
  await mongod.stop();
  console.log('\n========================================');
  console.log('🎉 CONTRACT VERIFICATION SUITE PASSED');
  console.log('========================================\n');
}

runContractTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
