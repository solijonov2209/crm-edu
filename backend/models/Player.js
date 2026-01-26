import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  fatherName: {
    type: String,
    trim: true,
    maxlength: [50, "Father's name cannot exceed 50 characters"]
  },
  birthDate: {
    type: Date,
    required: [true, 'Birth date is required']
  },
  birthYear: {
    type: Number,
    required: true
  },
  photo: {
    type: String,
    default: null
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: [true, 'Team is required']
  },
  jerseyNumber: {
    type: Number,
    min: [1, 'Jersey number must be at least 1'],
    max: [99, 'Jersey number cannot exceed 99']
  },
  position: {
    type: String,
    required: [true, 'Position is required'],
    enum: ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST']
  },
  preferredFoot: {
    type: String,
    enum: ['left', 'right', 'both'],
    default: 'right'
  },
  height: {
    type: Number, // in cm
    min: [100, 'Height must be at least 100 cm'],
    max: [220, 'Height cannot exceed 220 cm']
  },
  weight: {
    type: Number, // in kg
    min: [20, 'Weight must be at least 20 kg'],
    max: [150, 'Weight cannot exceed 150 kg']
  },
  parentName: {
    type: String,
    trim: true
  },
  parentPhone: {
    type: String,
    trim: true
  },
  parentEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  address: {
    type: String,
    trim: true
  },
  medicalInfo: {
    bloodType: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', null],
      default: null
    },
    allergies: {
      type: String,
      trim: true
    },
    medicalNotes: {
      type: String,
      trim: true
    }
  },
  statistics: {
    matchesPlayed: { type: Number, default: 0 },
    goals: { type: Number, default: 0 },
    assists: { type: Number, default: 0 },
    yellowCards: { type: Number, default: 0 },
    redCards: { type: Number, default: 0 },
    minutesPlayed: { type: Number, default: 0 },
    cleanSheets: { type: Number, default: 0 } // for goalkeepers
  },
  ratings: {
    pace: { type: Number, min: 1, max: 100, default: 50 },
    shooting: { type: Number, min: 1, max: 100, default: 50 },
    passing: { type: Number, min: 1, max: 100, default: 50 },
    dribbling: { type: Number, min: 1, max: 100, default: 50 },
    defending: { type: Number, min: 1, max: 100, default: 50 },
    physical: { type: Number, min: 1, max: 100, default: 50 }
  },
  physicalCondition: {
    type: Number,
    min: 0,
    max: 100,
    default: 100
  },
  isInjured: {
    type: Boolean,
    default: false
  },
  injuryDetails: {
    type: String,
    trim: true
  },
  injuryEndDate: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  joinDate: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
playerSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for age
playerSchema.virtual('age').get(function() {
  const today = new Date();
  const birthDate = new Date(this.birthDate);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Virtual for overall rating
playerSchema.virtual('overallRating').get(function() {
  const { pace, shooting, passing, dribbling, defending, physical } = this.ratings;
  return Math.round((pace + shooting + passing + dribbling + defending + physical) / 6);
});

// Pre-save hook to set birthYear from birthDate
playerSchema.pre('save', function(next) {
  if (this.birthDate) {
    this.birthYear = new Date(this.birthDate).getFullYear();
  }
  next();
});

// Index for efficient queries
playerSchema.index({ team: 1, isActive: 1 });
playerSchema.index({ birthYear: 1 });
playerSchema.index({ position: 1 });

const Player = mongoose.model('Player', playerSchema);

export default Player;
