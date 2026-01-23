const mongoose = require('mongoose');

const jobApplicationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  jobId: {
    type: String,
    required: true,
    index: true
  },
  company: {
    name: String,
    website: String,
    hhId: String,
    contacts: {
      email: String,
      phone: String,
      foundAt: Date
    }
  },
  position: {
    title: String,
    url: String,
    salary: {
      from: Number,
      to: Number,
      currency: String
    },
    location: String,
    description: String
  },
  status: {
    type: String,
    enum: ['pending', 'searched', 'contact_found', 'applied', 'responded', 'rejected', 'error'],
    default: 'pending'
  },
  searchResults: {
    companyWebsite: String,
    contactMethod: String, // 'email', 'form', 'phone'
    confidence: Number, // 0-100
    searchLogs: [{
      timestamp: Date,
      action: String,
      result: String,
      error: String
    }]
  },
  applicationDetails: {
    emailSent: Boolean,
    emailSubject: String,
    emailContent: String,
    sentAt: Date,
    response: String,
    responseAt: Date
  },
  metadata: {
    source: { type: String, default: 'hh.ru' },
    tags: [String],
    priority: { type: Number, default: 1 } // 1-5
  }
}, {
  timestamps: true
});

// Indexes
jobApplicationSchema.index({ userId: 1, status: 1 });
jobApplicationSchema.index({ userId: 1, createdAt: -1 });
jobApplicationSchema.index({ status: 1, createdAt: -1 });
jobApplicationSchema.index({ 'company.contacts.email': 1 });

module.exports = mongoose.model('JobApplication', jobApplicationSchema);