const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a customer name']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true
    },
    contact: {
        type: String,
        required: [true, 'Please add a contact number']
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Banned', 'On Hold'],
        default: 'Active'
    },
    riskScore: {
        type: String,
        enum: ['Low', 'Medium', 'High'],
        default: 'Low'
    },
    ltv: {
        type: Number,
        default: 0
    },
    mrr: {
        type: Number,
        default: 0
    },
    healthScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 100
    },
    segment: {
        type: String,
        enum: ['VIP', 'Regular', 'Standard', 'Premium', 'Inactive'],
        default: 'Regular'
    },
    clv: {
        type: Number,
        default: 0
    },
    pendingPayments: {
        type: Number,
        default: 0
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lastActivity: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Customer', customerSchema);
