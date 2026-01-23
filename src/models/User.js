const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    sparse: true
  },
  firstName: String,
  lastName: String,
  email: {
    type: String,
    required: true,
    unique: true
  },
  phone: String,
  resume: {
    hhId: String,
    url: String,
    lastUpdated: Date
  },
  preferences: {
    keywords: [String],
    location: String,
    salary: {
      min: Number,
      max: Number,
      currency: { type: String, default: 'RUR' }
    },
    experience: String,
    employmentType: [String] // full-time, part-time, etc.
  },
  templates: {
    coverLetter: {
      type: String,
      default: `Уважаемый работодатель,

Меня заинтересовала вакансия {{position}} в вашей компании.

Мои навыки и опыт позволяют мне успешно выполнять поставленные задачи.
Буду рад обсудить возможности сотрудничества.

С уважением,
{{name}}`
    },
    emailSubject: {
      type: String,
      default: 'Отклик на вакансию {{position}}'
    }
  },
  settings: {
    autoApply: { type: Boolean, default: false },
    notifications: { type: Boolean, default: true },
    maxApplicationsPerDay: { type: Number, default: 5 }
  },
  statistics: {
    totalApplications: { type: Number, default: 0 },
    successfulApplications: { type: Number, default: 0 },
    lastActivity: Date
  }
}, {
  timestamps: true
});

// Indexes
userSchema.index({ 'preferences.keywords': 1 });
userSchema.index({ 'statistics.lastActivity': 1 });

module.exports = mongoose.model('User', userSchema);