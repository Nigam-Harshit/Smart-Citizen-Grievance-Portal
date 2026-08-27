const mongoose = require('mongoose');

let mongoServer;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return;
  }

  let isMemoryServer = false;
  const isProduction = process.env.NODE_ENV === 'production' || !!process.env.MONGO_URI;

  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/citizen_grievance_portal';
    const conn = await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    if (isProduction) {
      console.error(`❌ MongoDB Atlas Connection Failed: ${error.message}`);
      console.error('🚫 Production mode requires a valid persistent MongoDB Atlas connection. Exiting.');
      process.exit(1);
    }

    console.log(`⚠️ Local MongoDB not found (${error.message}). Starting MongoMemoryServer for local dev...`);
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

  // Seeding logic:
  // - Local MongoMemoryServer always auto-seeds for zero-setup execution.
  // - Production/Atlas database seeds ONLY IF SEED_DEMO_DATA === 'true' is explicitly passed.
  try {
    const shouldSeed = isMemoryServer || process.env.SEED_DEMO_DATA === 'true';
    if (shouldSeed) {
      console.log('🌱 Seeding demo data into active database...');
      const seedData = require('../seed');
      await seedData(true); // pass true to skip re-connecting
    }
  } catch (seedErr) {
    console.error('⚠️ Seed execution warning:', seedErr.message);
  }
};

module.exports = connectDB;