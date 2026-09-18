const mongoose = require('mongoose');

const storageUsageSchema = new mongoose.Schema({
  period: {
    type: String, // Format: YYYY-MM (e.g., '2026-09')
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  totalUploads: {
    type: Number,
    default: 0,
    min: 0
  },
  totalStoredBytes: {
    type: Number,
    default: 0,
    min: 0
  },
  reservedBytes: {
    type: Number,
    default: 0,
    min: 0
  },
  photoAccessRequests: {
    type: Number,
    default: 0,
    min: 0
  },
  uploadFailures: {
    type: Number,
    default: 0,
    min: 0
  },
  consecutiveFailures: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'SAFE_MODE', 'DISABLED'],
    default: 'ACTIVE',
    index: true
  },
  safeModeReason: {
    type: String,
    default: null
  },
  safeModeActivatedAt: {
    type: Date,
    default: null
  },
  dailyUsage: [{
    date: { type: String }, // Format: YYYY-MM-DD
    uploads: { type: Number, default: 0 },
    bytes: { type: Number, default: 0 }
  }],
  userUsage: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploads: { type: Number, default: 0 }
  }],
  ipUsage: [{
    ip: { type: String },
    uploads: { type: Number, default: 0 }
  }],
  lastReconciledAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('StorageUsage', storageUsageSchema);

