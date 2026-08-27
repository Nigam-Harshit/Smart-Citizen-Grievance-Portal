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
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Grievance', grievanceSchema);
