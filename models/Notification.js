const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
        index: true
    },
    actor: {
        type: mongoose.Schema.Types.Mixed
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['ASSIGNMENT', 'STATUS_CHANGE', 'TIMELINE_UPDATE', 'SYSTEM'],
        default: 'SYSTEM'
    },
    grievanceId: {
        type: mongoose.Schema.Types.Mixed
    },
    eventKey: {
        type: String,
        trim: true
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true
    },
    readAt: {
        type: Date
    }
}, {
    timestamps: true
});

// High-performance compound indexes for rapid user notification feeds
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

// Prevent duplicate notifications for identical retried operations
notificationSchema.index(
    { recipient: 1, eventKey: 1 },
    { unique: true, partialFilterExpression: { eventKey: { $type: 'string' } } }
);

module.exports = mongoose.model('Notification', notificationSchema);

