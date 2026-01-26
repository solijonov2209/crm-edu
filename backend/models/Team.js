import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Team name is required'],
    trim: true,
    maxlength: [100, 'Team name cannot exceed 100 characters']
  },
  ageCategory: {
    type: String,
    required: [true, 'Age category is required'],
    trim: true
  },
  birthYear: {
    type: Number,
    required: [true, 'Birth year is required'],
    min: [2000, 'Birth year must be after 2000'],
    max: [new Date().getFullYear(), 'Birth year cannot be in the future']
  },
  coach: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assistantCoach: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  logo: {
    type: String,
    default: null
  },
  primaryColor: {
    type: String,
    default: '#1e40af'
  },
  secondaryColor: {
    type: String,
    default: '#ffffff'
  },
  homeVenue: {
    type: String,
    trim: true
  },
  trainingSchedule: [{
    dayOfWeek: {
      type: Number, // 0-6 (Sunday-Saturday)
      required: true
    },
    startTime: {
      type: String,
      required: true
    },
    endTime: {
      type: String,
      required: true
    },
    location: {
      type: String,
      trim: true
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  statistics: {
    totalMatches: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    draws: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    goalsFor: { type: Number, default: 0 },
    goalsAgainst: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for players count
teamSchema.virtual('players', {
  ref: 'Player',
  localField: '_id',
  foreignField: 'team',
  count: true
});

// Virtual for goal difference
teamSchema.virtual('statistics.goalDifference').get(function() {
  return this.statistics.goalsFor - this.statistics.goalsAgainst;
});

// Virtual for points
teamSchema.virtual('statistics.points').get(function() {
  return (this.statistics.wins * 3) + this.statistics.draws;
});

const Team = mongoose.model('Team', teamSchema);

export default Team;
