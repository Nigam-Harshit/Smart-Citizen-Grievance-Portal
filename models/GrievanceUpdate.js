const mongoose = require('mongoose');

const grievanceUpdateSchema = new mongoose.Schema({
    grievanceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Grievance',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['Status Update', 'Officer Note', 'Citizen Response', 'Escalation', 'Resolution'],
        required: true
    },
    notes: {
        type: String,
        required: true
    },
    statusChange: {
        type: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('GrievanceUpdate', grievanceUpdateSchema);
