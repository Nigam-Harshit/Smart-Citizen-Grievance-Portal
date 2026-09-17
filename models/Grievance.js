const mongoose = require('mongoose');

const grievanceSchema = new mongoose.Schema({
  citizenId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Citizen',
    required: true
  },
  citizenName: {
    type: String,
    required: true
  },
  citizenEmail: {
    type: String,
    lowercase: true,
    trim: true
  },
  title: {
    type: String,
    required: [true, 'Please add a grievance title']
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  category: {
    type: String,
    enum: ['Sanitation', 'Roads & Traffic', 'Water Supply', 'Electricity', 'Public Safety', 'Other'],
    default: 'Other',
    required: [true, 'Please select a category']
  },
  location: {
    type: String,
    required: [true, 'Please add a location']
  },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Resolved'],
    default: 'Open'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  officerName: {
    type: String
  },
  deadline: {
    type: Date
  },
  resolvedAt: {
    type: Date
  },
  // V2.0.0 Optional Photographic Evidence Attachment Metadata
  attachment: {
    storageKey: {
      type: String,
      trim: true
    },
    originalName: {
      type: String,
      trim: true
    },
    mimeType: {
      type: String,
      default: 'image/jpeg'
    },
    size: {
      type: Number // Normalized stored JPEG size in bytes
    },
    dimensions: {
      width: { type: Number },
      height: { type: Number }
    },
    checksum: {
      type: String // SHA-256 hex checksum
    },
    provider: {
      type: String,
      enum: ['s3', 'r2'],
      default: 's3'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  // V2.0.0 Optional Client Idempotency Key
  idempotencyKey: {
    type: String,
    trim: true,
    sparse: true
  }
}, {
  timestamps: true
});

// Sparse unique compound index to prevent duplicate submissions per citizen
grievanceSchema.index({ citizenId: 1, idempotencyKey: 1 }, { unique: true, sparse: true });

// Sparse index on storage key for orphan reconciliation and rapid asset lookups
grievanceSchema.index({ 'attachment.storageKey': 1 }, { sparse: true });

module.exports = mongoose.model('Grievance', grievanceSchema);
