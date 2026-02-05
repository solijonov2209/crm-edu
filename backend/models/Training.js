import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'excused', 'injured'],
    default: 'present'
  },
  arrivalTime: {
    type: String
  },
  rating: {
    type: Number,
    min: 1,
    max: 10
  },
  performance: {
    effort: { type: Number, min: 1, max: 10 },
    technique: { type: Number, min: 1, max: 10 },
    attitude: { type: Number, min: 1, max: 10 },
    teamwork: { type: Number, min: 1, max: 10 }
  },
  notes: {
    type: String,
    trim: true
  }
}, { _id: true });

const trainingSchema = new mongoose.Schema({
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: [true, 'Team is required']
  },
  coach: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Coach is required']
  },
  date: {
    type: Date,
    required: [true, 'Training date is required']
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required']
  },
  location: {
    type: String,
    trim: true,
    default: 'Main Training Ground'
  },
  type: {
    type: String,
    enum: ['regular', 'tactical', 'physical', 'recovery', 'match_prep', 'friendly'],
    default: 'regular'
  },
  focus: {
    type: [String],
    default: []
  },
  description: {
    type: String,
    trim: true
  },
  attendance: [attendanceSchema],
  drills: [{
    name: String,
    duration: Number, // in minutes
    description: String
  }],
  photos: [{
    url: String,
    caption: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  videos: [{
    url: String,
    caption: String,
    duration: Number, // in seconds
    uploadedAt: { type: Date, default: Date.now }
  }],
  weather: {
    condition: {
      type: String,
      enum: ['sunny', 'cloudy', 'rainy', 'windy', 'snowy', 'hot', 'cold'],
      default: 'sunny'
    },
    temperature: Number
  },
  coachNotes: {
    type: String,
    trim: true
  },
  // Training plan document (PDF/DOCX)
  trainingPlan: {
    url: String,
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    uploadedAt: { type: Date, default: Date.now }
  },
  overallRating: {
    type: Number,
    min: 1,
    max: 10
  },
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  cancellationReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for attendance statistics
trainingSchema.virtual('attendanceStats').get(function() {
  if (!this.attendance || this.attendance.length === 0) {
    return { total: 0, present: 0, absent: 0, late: 0, excused: 0, injured: 0, percentage: 0 };
  }

  const stats = {
    total: this.attendance.length,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    injured: 0
  };

  this.attendance.forEach(a => {
    if (stats[a.status] !== undefined) {
      stats[a.status]++;
    }
  });

  stats.percentage = Math.round(((stats.present + stats.late) / stats.total) * 100);
  return stats;
});

// Index for efficient queries
trainingSchema.index({ team: 1, date: -1 });
trainingSchema.index({ coach: 1, date: -1 });
trainingSchema.index({ status: 1 });

const Training = mongoose.model('Training', trainingSchema);

export default Training;
