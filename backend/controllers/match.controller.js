import Match from '../models/Match.js';
import Player from '../models/Player.js';
import Team from '../models/Team.js';
import { getFileUrl } from '../middleware/upload.js';

// Helper function to check if coach has access to a team
const coachHasTeamAccess = (user, teamId) => {
  if (user.role !== 'coach') return true;

  const teamIdStr = teamId?.toString() || teamId;

  // Check teams array first
  if (user.teams && user.teams.length > 0) {
    return user.teams.some(t => (t._id?.toString() || t.toString()) === teamIdStr);
  }

  // Fallback to single team
  if (user.team) {
    return (user.team._id?.toString() || user.team.toString()) === teamIdStr;
  }

  return false;
};

// @desc    Get all matches
// @route   GET /api/matches
// @access  Private
export const getMatches = async (req, res) => {
  try {
    const {
      team,
      status,
      competition,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    const query = {};

    // For coaches, filter by their teams
    if (req.user.role === 'coach') {
      const coachTeamIds = req.user.teams?.length > 0
        ? req.user.teams.map(t => t._id || t)
        : (req.user.team ? [req.user.team._id || req.user.team] : []);

      if (team && coachTeamIds.some(id => id.toString() === team)) {
        query.team = team;
      } else if (coachTeamIds.length > 0) {
        query.team = { $in: coachTeamIds };
      }
    } else if (team) {
      query.team = team;
    }

    if (status) query.status = status;
    if (competition) query.competition = { $regex: competition, $options: 'i' };
    if (startDate || endDate) {
      query.matchDate = {};
      if (startDate) query.matchDate.$gte = new Date(startDate);
      if (endDate) query.matchDate.$lte = new Date(endDate);
    }

    const total = await Match.countDocuments(query);
    const matches = await Match.find(query)
      .populate('team', 'name ageCategory primaryColor logo')
      .populate('lineup.player', 'firstName lastName jerseyNumber position photo')
      .populate('substitutes', 'firstName lastName jerseyNumber position photo')
      .populate('goals.player', 'firstName lastName jerseyNumber')
      .populate('goals.assist', 'firstName lastName')
      .populate('manOfTheMatch', 'firstName lastName photo')
      .sort({ matchDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: matches.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      matches
    });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single match
// @route   GET /api/matches/:id
// @access  Private
export const getMatch = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('team', 'name ageCategory primaryColor secondaryColor logo coach')
      .populate('lineup.player', 'firstName lastName jerseyNumber position photo ratings statistics')
      .populate('substitutes', 'firstName lastName jerseyNumber position photo')
      .populate('goals.player', 'firstName lastName jerseyNumber photo')
      .populate('goals.assist', 'firstName lastName')
      .populate('cards.player', 'firstName lastName jerseyNumber')
      .populate('substitutions.playerOut', 'firstName lastName jerseyNumber')
      .populate('substitutions.playerIn', 'firstName lastName jerseyNumber')
      .populate('injuries.player', 'firstName lastName jerseyNumber')
      .populate('events.player', 'firstName lastName')
      .populate('manOfTheMatch', 'firstName lastName photo')
      .populate('playerRatings.player', 'firstName lastName jerseyNumber');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Check authorization for coaches
    if (!coachHasTeamAccess(req.user, match.team._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this match'
      });
    }

    res.status(200).json({
      success: true,
      match
    });
  } catch (error) {
    console.error('Get match error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create match
// @route   POST /api/matches
// @access  Private
export const createMatch = async (req, res) => {
  try {
    const matchData = { ...req.body };

    // For coaches, force team to be their team
    if (req.user.role === 'coach' && req.user.team) {
      matchData.team = req.user.team._id;
    }

    const match = await Match.create(matchData);

    const populatedMatch = await Match.findById(match._id)
      .populate('team', 'name ageCategory primaryColor logo');

    res.status(201).json({
      success: true,
      match: populatedMatch
    });
  } catch (error) {
    console.error('Create match error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Update match
// @route   PUT /api/matches/:id
// @access  Private
export const updateMatch = async (req, res) => {
  try {
    let match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Check authorization for coaches
    if (req.user.role === 'coach' &&
        (!req.user.team || req.user.team._id.toString() !== match.team.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this match'
      });
    }

    match = await Match.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('team', 'name ageCategory primaryColor logo')
      .populate('lineup.player', 'firstName lastName jerseyNumber position photo')
      .populate('substitutes', 'firstName lastName jerseyNumber position photo');

    res.status(200).json({
      success: true,
      match
    });
  } catch (error) {
    console.error('Update match error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete match
// @route   DELETE /api/matches/:id
// @access  Private
export const deleteMatch = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Check authorization for coaches
    if (req.user.role === 'coach' &&
        (!req.user.team || req.user.team._id.toString() !== match.team.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this match'
      });
    }

    await match.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Match deleted successfully'
    });
  } catch (error) {
    console.error('Delete match error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update match lineup
// @route   PUT /api/matches/:id/lineup
// @access  Private
export const updateLineup = async (req, res) => {
  try {
    const { lineup, substitutes, formation } = req.body;

    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    match.lineup = lineup;
    match.substitutes = substitutes;
    match.formation = formation;
    match.status = 'lineup_set';
    await match.save();

    const populatedMatch = await Match.findById(match._id)
      .populate('team', 'name ageCategory primaryColor logo')
      .populate('lineup.player', 'firstName lastName jerseyNumber position photo ratings')
      .populate('substitutes', 'firstName lastName jerseyNumber position photo');

    res.status(200).json({
      success: true,
      match: populatedMatch
    });
  } catch (error) {
    console.error('Update lineup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Add goal to match
// @route   POST /api/matches/:id/goals
// @access  Private
export const addGoal = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    match.goals.push(req.body);

    // Update score
    if (match.isHome) {
      match.score.home += 1;
    } else {
      match.score.away += 1;
    }

    // Update player statistics
    await Player.findByIdAndUpdate(req.body.player, {
      $inc: { 'statistics.goals': 1 }
    });

    if (req.body.assist) {
      await Player.findByIdAndUpdate(req.body.assist, {
        $inc: { 'statistics.assists': 1 }
      });
    }

    await match.save();

    res.status(200).json({
      success: true,
      match
    });
  } catch (error) {
    console.error('Add goal error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Add card to match
// @route   POST /api/matches/:id/cards
// @access  Private
export const addCard = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    match.cards.push(req.body);

    // Update player statistics
    const cardField = req.body.type === 'yellow' ? 'statistics.yellowCards' : 'statistics.redCards';
    await Player.findByIdAndUpdate(req.body.player, {
      $inc: { [cardField]: 1 }
    });

    await match.save();

    res.status(200).json({
      success: true,
      match
    });
  } catch (error) {
    console.error('Add card error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Add substitution to match
// @route   POST /api/matches/:id/substitutions
// @access  Private
export const addSubstitution = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    match.substitutions.push(req.body);
    await match.save();

    res.status(200).json({
      success: true,
      match
    });
  } catch (error) {
    console.error('Add substitution error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Complete match and update statistics
// @route   PUT /api/matches/:id/complete
// @access  Private
export const completeMatch = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    const {
      score,
      statistics,
      opponentStatistics,
      manOfTheMatch,
      playerRatings,
      coachNotes
    } = req.body;

    match.score = score || match.score;
    match.statistics = statistics || match.statistics;
    match.opponentStatistics = opponentStatistics || match.opponentStatistics;
    match.manOfTheMatch = manOfTheMatch;
    match.playerRatings = playerRatings || [];
    match.coachNotes = coachNotes;
    match.status = 'completed';

    await match.save();

    // Update team statistics
    const team = await Team.findById(match.team);
    const ourScore = match.isHome ? match.score.home : match.score.away;
    const theirScore = match.isHome ? match.score.away : match.score.home;

    team.statistics.totalMatches += 1;
    team.statistics.goalsFor += ourScore;
    team.statistics.goalsAgainst += theirScore;

    if (ourScore > theirScore) {
      team.statistics.wins += 1;
    } else if (ourScore < theirScore) {
      team.statistics.losses += 1;
    } else {
      team.statistics.draws += 1;
    }

    await team.save();

    // Update player match statistics
    for (const lineupPlayer of match.lineup) {
      if (!lineupPlayer.isSubstitute) {
        await Player.findByIdAndUpdate(lineupPlayer.player, {
          $inc: { 'statistics.matchesPlayed': 1 }
        });
      }
    }

    res.status(200).json({
      success: true,
      match
    });
  } catch (error) {
    console.error('Complete match error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get upcoming matches
// @route   GET /api/matches/upcoming
// @access  Private
export const getUpcomingMatches = async (req, res) => {
  try {
    const query = {
      matchDate: { $gte: new Date() },
      status: { $in: ['scheduled', 'lineup_set'] }
    };

    // For coaches, only show their team's matches
    if (req.user.role === 'coach' && req.user.team) {
      query.team = req.user.team._id;
    }

    const matches = await Match.find(query)
      .populate('team', 'name ageCategory primaryColor logo')
      .sort({ matchDate: 1 })
      .limit(10);

    res.status(200).json({
      success: true,
      matches
    });
  } catch (error) {
    console.error('Get upcoming matches error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get match statistics for a team
// @route   GET /api/matches/stats/:teamId
// @access  Private
export const getMatchStats = async (req, res) => {
  try {
    const teamId = req.params.teamId;

    const matches = await Match.find({
      team: teamId,
      status: 'completed'
    });

    const stats = {
      total: matches.length,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      cleanSheets: 0,
      byCompetition: {},
      recentForm: []
    };

    matches.forEach(match => {
      const ourScore = match.isHome ? match.score.home : match.score.away;
      const theirScore = match.isHome ? match.score.away : match.score.home;

      stats.goalsFor += ourScore;
      stats.goalsAgainst += theirScore;

      if (theirScore === 0) stats.cleanSheets++;

      if (ourScore > theirScore) {
        stats.wins++;
      } else if (ourScore < theirScore) {
        stats.losses++;
      } else {
        stats.draws++;
      }

      // Count by competition
      const comp = match.competition || 'Friendly';
      if (!stats.byCompetition[comp]) {
        stats.byCompetition[comp] = { played: 0, wins: 0, draws: 0, losses: 0 };
      }
      stats.byCompetition[comp].played++;
      if (ourScore > theirScore) stats.byCompetition[comp].wins++;
      else if (ourScore < theirScore) stats.byCompetition[comp].losses++;
      else stats.byCompetition[comp].draws++;
    });

    // Get recent form (last 5 matches)
    const recentMatches = matches
      .sort((a, b) => new Date(b.matchDate) - new Date(a.matchDate))
      .slice(0, 5);

    stats.recentForm = recentMatches.map(match => {
      const ourScore = match.isHome ? match.score.home : match.score.away;
      const theirScore = match.isHome ? match.score.away : match.score.home;
      if (ourScore > theirScore) return 'W';
      if (ourScore < theirScore) return 'L';
      return 'D';
    });

    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get match stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
