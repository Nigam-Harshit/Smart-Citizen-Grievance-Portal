const mongoose = require('mongoose');

const insightSchema = new mongoose.Schema({
    citizenId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Citizen',
        required: true
    },
    riskScore: {
        type: String,
        enum: ['Low', 'Medium', 'High'],
        default: 'Low'
    },
    recommendation: {
        type: String,
        required: true
    },
    riskFactors: [{
        type: String
    }],
    generatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Insight', insightSchema);
