const mongoose = require('mongoose');

const citizenSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a citizen name']
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
    address: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Banned'],
        default: 'Active'
    },
    escalationRisk: {
        type: String,
        enum: ['Low', 'Medium', 'High'],
        default: 'Low'
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    linkedUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lastActivity: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Citizen', citizenSchema);
