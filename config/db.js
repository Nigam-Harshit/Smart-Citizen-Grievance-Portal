const mongoose = require('mongoose');

let mongoServer;

const connectDB = async () => {
  let isMemoryServer = false;
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/citizen_grievance_portal';
    const conn = await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.log(`⚠️ Local MongoDB not found (${error.message}). Starting MongoMemoryServer...`);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      const conn = await mongoose.connect(uri);
      isMemoryServer = true;
      console.log(`🚀 MongoMemoryServer Running & Connected at: ${conn.connection.host}`);
    } catch (memErr) {
      console.error(`❌ Failed to start MongoMemoryServer: ${memErr.message}`);
      process.exit(1);
    }
  }

  // Auto-seed database if running on MongoMemoryServer or if database is empty
  try {
    const User = require('../models/User');
    const userCount = await User.countDocuments();
    if (isMemoryServer || userCount === 0) {
      console.log('🌱 Auto-seeding initial demo data into active database...');
      const seedData = require('../seed');
      await seedData(true); // pass true to skip re-connecting
    }
  } catch (seedErr) {
    console.error('⚠️ Auto-seed check warning:', seedErr.message);
  }
};

module.exports = connectDB;