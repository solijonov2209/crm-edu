import mongoose from 'mongoose';

const goalSchema = new mongoose.Schema({
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  minute: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['regular', 'penalty', 'free_kick', 'header', 'own_goal'],
    default: 'regular'
  },
  assist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }
}, { _id: true });

const cardSchema = new mongoose.Schema({
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  minute: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['yellow', 'red', 'second_yellow'],
    required: true
  },
  reason: {
    type: String,
    trim: true
  }
}, { _id: true });

const substitutionSchema = new mongoose.Schema({
  playerOut: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  playerIn: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  minute: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    enum: ['tactical', 'injury', 'fatigue', 'performance'],
    default: 'tactical'
  }
}, { _id: true });

const injurySchema = new mongoose.Schema({
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  minute: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  severity: {
    type: String,
    enum: ['minor', 'moderate', 'severe'],
    default: 'minor'
  },
  continuedPlaying: {
    type: Boolean,
    default: false
  }
}, { _id: true });

const lineupPlayerSchema = new mongoose.Schema({
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  position: {
    type: String,
    required: true
  },
  positionX: {
    type: Number, // 0-100 percentage position on field
    required: true
  },
  positionY: {
    type: Number, // 0-100 percentage position on field
    required: true
  },
  isSubstitute: {
    type: Boolean,
    default: false
  },
  isCaptain: {
    type: Boolean,
    default: false
  }
}, { _id: true });

const matchEventSchema = new mongoose.Schema({
  minute: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['goal', 'yellow_card', 'red_card', 'substitution', 'injury', 'var_check', 'penalty_missed', 'note'],
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }
}, { _id: true, timestamps: true });

const matchSchema = new mongoose.Schema({
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: [true, 'Team is required']
  },
  opponent: {
    name: {
      type: String,
      required: [true, 'Opponent name is required'],
      trim: true
    },
    logo: String,
    color: {
      type: String,
      default: '#666666'
    }
  },
  matchDate: {
    type: Date,
    required: [true, 'Match date is required']
  },
  kickoffTime: {
    type: String,
    required: [true, 'Kickoff time is required']
  },
  venue: {
    type: String,
    trim: true
  },
  isHome: {
    type: Boolean,
    default: true
  },
  competition: {
    type: String,
    trim: true,
    default: 'Friendly'
  },
  status: {
    type: String,
    enum: ['scheduled', 'lineup_set', 'in_progress', 'half_time', 'completed', 'postponed', 'cancelled'],
    default: 'scheduled'
  },
  formation: {
    type: String,
    default: '4-3-3'
  },
  lineup: [lineupPlayerSchema],
  substitutes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }],
  score: {
    home: { type: Number, default: 0 },
    away: { type: Number, default: 0 }
  },
  halfTimeScore: {
    home: { type: Number, default: 0 },
    away: { type: Number, default: 0 }
  },
  goals: [goalSchema],
  opponentGoals: [{
    minute: Number,
    scorerName: String,
    type: String
  }],
  cards: [cardSchema],
  substitutions: [substitutionSchema],
  injuries: [injurySchema],
  events: [matchEventSchema],
  statistics: {
    possession: { type: Number, default: 50 },
    shots: { type: Number, default: 0 },
    shotsOnTarget: { type: Number, default: 0 },
    corners: { type: Number, default: 0 },
    fouls: { type: Number, default: 0 },
    offsides: { type: Number, default: 0 },
    passes: { type: Number, default: 0 },
    passAccuracy: { type: Number, default: 0 }
  },
  opponentStatistics: {
    possession: { type: Number, default: 50 },
    shots: { type: Number, default: 0 },
    shotsOnTarget: { type: Number, default: 0 },
    corners: { type: Number, default: 0 },
    fouls: { type: Number, default: 0 },
    offsides: { type: Number, default: 0 }
  },
  weather: {
    condition: String,
    temperature: Number
  },
  referee: {
    type: String,
    trim: true
  },
  attendance: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    trim: true
  },
  coachNotes: {
    type: String,
    trim: true
  },
  photos: [{
    url: String,
    caption: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  videos: [{
    url: String,
    caption: String,
    duration: Number,
    uploadedAt: { type: Date, default: Date.now }
  }],
  manOfTheMatch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  },
  playerRatings: [{
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player'
    },
    rating: {
      type: Number,
      min: 1,
      max: 10
    },
    notes: String
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for result
matchSchema.virtual('result').get(function() {
  if (this.status !== 'completed') return null;

  const ourScore = this.isHome ? this.score.home : this.score.away;
  const theirScore = this.isHome ? this.score.away : this.score.home;

  if (ourScore > theirScore) return 'win';
  if (ourScore < theirScore) return 'loss';
  return 'draw';
});

// Virtual for final score string
matchSchema.virtual('finalScore').get(function() {
  return `${this.score.home} - ${this.score.away}`;
});

// Index for efficient queries
matchSchema.index({ team: 1, matchDate: -1 });
matchSchema.index({ status: 1 });
matchSchema.index({ matchDate: 1 });

const Match = mongoose.model('Match', matchSchema);

export default Match;
