const mongoose = require('mongoose');

const insightSchema = new mongoose.Schema({
    citizenId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Citizen',
        required: true
    },
    // Numeric deterministic risk score (0-100)
    numericScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    // Categorical risk level for badges & backward compatibility
    riskScore: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        default: 'Low'
    },
    recommendation: {
        type: String,
        required: true
    },
    // Itemized deterministic reasons for the risk score
    reasons: [{
        type: String
    }],
    // Backward compatibility alias for reasons
    riskFactors: [{
        type: String
    }],
    engineType: {
        type: String,
        default: 'DETERMINISTIC_HEURISTIC'
    },
    generatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Pre-validate hook to sync reasons <-> riskFactors
insightSchema.pre('validate', function () {
    if (this.reasons && this.reasons.length > 0 && (!this.riskFactors || this.riskFactors.length === 0)) {
        this.riskFactors = this.reasons;
    } else if (this.riskFactors && this.riskFactors.length > 0 && (!this.reasons || this.reasons.length === 0)) {
        this.reasons = this.riskFactors;
    }
});

module.exports = mongoose.model('Insight', insightSchema);
