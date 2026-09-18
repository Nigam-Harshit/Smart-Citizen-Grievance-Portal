const mongoose = require('mongoose');
const { normalizeRole, CANONICAL_ROLES, formatRoleLabel } = require('../utils/roleHelper');

const grievanceUpdateSchema = new mongoose.Schema({
    grievanceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Grievance',
        required: true
    },
    // Canonical Author Metadata (V2.0.0 Architecture)
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    authorName: {
        type: String,
        trim: true
    },
    authorRole: {
        type: String,
        enum: CANONICAL_ROLES, // strictly canonical lowercase: 'admin', 'manager', 'officer', 'citizen'
        lowercase: true,
        trim: true
    },
    message: {
        type: String,
        trim: true
    },
    // Backward Compatibility Fields (V1 / Legacy)
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    type: {
        type: String,
        trim: true
    },
    notes: {
        type: String,
        trim: true
    },
    statusChange: {
        type: String
    }
}, {
    timestamps: true
});

// Pre-validate synchronization to guarantee 100% bidirectional backward compatibility
grievanceUpdateSchema.pre('validate', function () {
    // Sync authorId <-> userId
    if (!this.authorId && this.userId) {
        this.authorId = this.userId;
    }
    if (!this.userId && this.authorId) {
        this.userId = this.authorId;
    }

    // Sync message <-> notes
    if (!this.message && this.notes) {
        this.message = this.notes;
    }
    if (!this.notes && this.message) {
        this.notes = this.message;
    }

    // Ensure canonical authorRole
    if (this.authorRole) {
        this.authorRole = normalizeRole(this.authorRole);
    } else if (this.type) {
        this.authorRole = normalizeRole(this.type);
    } else {
        this.authorRole = 'citizen';
    }

    // Ensure type is populated for legacy consumers
    if (!this.type) {
        this.type = formatRoleLabel(this.authorRole);
    }
});

module.exports = mongoose.model('GrievanceUpdate', grievanceUpdateSchema);
