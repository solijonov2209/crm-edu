import Team from '../models/Team.js';
import Player from '../models/Player.js';
import User from '../models/User.js';
import Match from '../models/Match.js';
import { getFileUrl } from '../middleware/upload.js';

// Helper function to compute team statistics from matches
const computeTeamStats = (teamId, matches) => {
  const teamIdStr = teamId.toString();
  let totalMatches = 0;
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  matches.forEach(match => {
    if ((match.team?._id?.toString() || match.team?.toString()) === teamIdStr) {
      totalMatches++;
      const ourScore = match.isHome ? (match.score?.home || 0) : (match.score?.away || 0);
      const theirScore = match.isHome ? (match.score?.away || 0) : (match.score?.home || 0);

      goalsFor += ourScore;
      goalsAgainst += theirScore;

      if (ourScore > theirScore) wins++;
      else if (ourScore < theirScore) losses++;
      else draws++;
    }
  });

  return {
    totalMatches,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    goalDifference: goalsFor - goalsAgainst,
    points: (wins * 3) + draws
  };
};

// @desc    Get all teams
// @route   GET /api/teams
// @access  Private
export const getTeams = async (req, res) => {
  try {
    const { isActive, search, page = 1, limit = 10 } = req.query;

    const query = {};

    // For coaches, show their teams
    if (req.user.role === 'coach') {
      const coachTeamIds = req.user.teams?.length > 0
        ? req.user.teams.map(t => t._id || t)
        : (req.user.team ? [req.user.team._id || req.user.team] : []);

      if (coachTeamIds.length > 0) {
        query._id = { $in: coachTeamIds };
      }
    }

    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { ageCategory: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Team.countDocuments(query);
    const teams = await Team.find(query)
      .populate('coach', 'firstName lastName email')
      .populate('assistantCoach', 'firstName lastName email')
      .sort({ birthYear: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Get all completed matches for statistics calculation
    const teamIds = teams.map(t => t._id);
    const completedMatches = await Match.find({
      team: { $in: teamIds },
      status: 'completed'
    });

    // Get player counts and compute statistics for each team
    const teamsWithStats = await Promise.all(
      teams.map(async (team) => {
        const playerCount = await Player.countDocuments({ team: team._id, isActive: true });
        const computedStats = computeTeamStats(team._id, completedMatches);

        return {
          ...team.toObject(),
          playerCount,
          statistics: computedStats
        };
      })
    );

    res.status(200).json({
      success: true,
      count: teams.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      teams: teamsWithStats
    });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single team
// @route   GET /api/teams/:id
// @access  Private
export const getTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('coach', 'firstName lastName email phone photo')
      .populate('assistantCoach', 'firstName lastName email phone photo');

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check authorization for coaches (support multiple teams)
    if (req.user.role === 'coach') {
      const coachTeamIds = req.user.teams?.length > 0
        ? req.user.teams.map(t => (t._id || t).toString())
        : (req.user.team ? [(req.user.team._id || req.user.team).toString()] : []);

      if (!coachTeamIds.includes(team._id.toString())) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this team'
        });
      }
    }

    // Get player count
    const playerCount = await Player.countDocuments({ team: team._id, isActive: true });

    // Calculate real statistics from completed matches
    const completedMatches = await Match.find({
      team: team._id,
      status: 'completed'
    }).sort({ matchDate: -1 });

    let totalMatches = 0;
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;

    completedMatches.forEach(match => {
      totalMatches++;
      const ourScore = match.isHome ? (match.score?.home || 0) : (match.score?.away || 0);
      const theirScore = match.isHome ? (match.score?.away || 0) : (match.score?.home || 0);

      goalsFor += ourScore;
      goalsAgainst += theirScore;

      if (ourScore > theirScore) wins++;
      else if (ourScore < theirScore) losses++;
      else draws++;
    });

    // Get recent matches (last 5)
    const recentMatches = completedMatches.slice(0, 5).map(match => ({
      _id: match._id,
      opponent: match.opponent,
      matchDate: match.matchDate,
      score: match.score,
      isHome: match.isHome,
      competition: match.competition,
      result: (() => {
        const ourScore = match.isHome ? (match.score?.home || 0) : (match.score?.away || 0);
        const theirScore = match.isHome ? (match.score?.away || 0) : (match.score?.home || 0);
        if (ourScore > theirScore) return 'W';
        if (ourScore < theirScore) return 'L';
        return 'D';
      })()
    }));

    // Get upcoming matches
    const upcomingMatches = await Match.find({
      team: team._id,
      status: { $in: ['scheduled', 'lineup_set'] },
      matchDate: { $gte: new Date() }
    })
      .sort({ matchDate: 1 })
      .limit(5)
      .select('opponent matchDate kickoffTime venue isHome competition');

    const computedStatistics = {
      totalMatches,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      goalDifference: goalsFor - goalsAgainst,
      points: (wins * 3) + draws
    };

    res.status(200).json({
      success: true,
      team: {
        ...team.toObject(),
        playerCount,
        statistics: computedStatistics,
        recentMatches,
        upcomingMatches
      }
    });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create team
// @route   POST /api/teams
// @access  Private/Admin
export const createTeam = async (req, res) => {
  try {
    const {
      name,
      ageCategory,
      birthYear,
      coach,
      assistantCoach,
      description,
      primaryColor,
      secondaryColor,
      homeVenue,
      trainingSchedule
    } = req.body;

    const team = await Team.create({
      name,
      ageCategory,
      birthYear,
      coach,
      assistantCoach,
      description,
      primaryColor,
      secondaryColor,
      homeVenue,
      trainingSchedule
    });

    // Update coach's team reference
    if (coach) {
      await User.findByIdAndUpdate(coach, { team: team._id });
    }

    res.status(201).json({
      success: true,
      team
    });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Update team
// @route   PUT /api/teams/:id
// @access  Private/Admin
export const updateTeam = async (req, res) => {
  try {
    const {
      name,
      ageCategory,
      birthYear,
      coach,
      assistantCoach,
      description,
      primaryColor,
      secondaryColor,
      homeVenue,
      trainingSchedule,
      isActive
    } = req.body;

    let team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Handle coach change
    const oldCoachId = team.coach?.toString();
    const newCoachId = coach;

    if (oldCoachId !== newCoachId) {
      if (oldCoachId) {
        await User.findByIdAndUpdate(oldCoachId, { team: null });
      }
      if (newCoachId) {
        await User.findByIdAndUpdate(newCoachId, { team: team._id });
      }
    }

    team = await Team.findByIdAndUpdate(
      req.params.id,
      {
        name,
        ageCategory,
        birthYear,
        coach,
        assistantCoach,
        description,
        primaryColor,
        secondaryColor,
        homeVenue,
        trainingSchedule,
        isActive
      },
      { new: true, runValidators: true }
    )
      .populate('coach', 'firstName lastName email')
      .populate('assistantCoach', 'firstName lastName email');

    res.status(200).json({
      success: true,
      team
    });
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete team
// @route   DELETE /api/teams/:id
// @access  Private/Admin
export const deleteTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check if team has players
    const playerCount = await Player.countDocuments({ team: team._id });
    if (playerCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete team with ${playerCount} players. Please reassign or remove players first.`
      });
    }

    // Remove team reference from coach
    if (team.coach) {
      await User.findByIdAndUpdate(team.coach, { team: null });
    }

    await team.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Team deleted successfully'
    });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Upload team logo
// @route   PUT /api/teams/:id/logo
// @access  Private/Admin
export const uploadTeamLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    const team = await Team.findByIdAndUpdate(
      req.params.id,
      { logo: getFileUrl(req, req.file.filename, 'photos') },
      { new: true }
    );

    res.status(200).json({
      success: true,
      team
    });
  } catch (error) {
    console.error('Upload logo error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update team statistics
// @route   PUT /api/teams/:id/statistics
// @access  Private
export const updateTeamStatistics = async (req, res) => {
  try {
    const { statistics } = req.body;

    const team = await Team.findByIdAndUpdate(
      req.params.id,
      { statistics },
      { new: true }
    );

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    res.status(200).json({
      success: true,
      team
    });
  } catch (error) {
    console.error('Update statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
