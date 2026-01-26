import Team from '../models/Team.js';
import Player from '../models/Player.js';
import User from '../models/User.js';
import { getFileUrl } from '../middleware/upload.js';

// @desc    Get all teams
// @route   GET /api/teams
// @access  Private
export const getTeams = async (req, res) => {
  try {
    const { isActive, search, page = 1, limit = 10 } = req.query;

    const query = {};

    // For coaches, only show their team
    if (req.user.role === 'coach' && req.user.team) {
      query._id = req.user.team._id;
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

    // Get player counts for each team
    const teamsWithCounts = await Promise.all(
      teams.map(async (team) => {
        const playerCount = await Player.countDocuments({ team: team._id, isActive: true });
        return {
          ...team.toObject(),
          playerCount
        };
      })
    );

    res.status(200).json({
      success: true,
      count: teams.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      teams: teamsWithCounts
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

    // Check authorization for coaches
    if (req.user.role === 'coach' &&
        (!req.user.team || req.user.team._id.toString() !== team._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this team'
      });
    }

    // Get player count
    const playerCount = await Player.countDocuments({ team: team._id, isActive: true });

    res.status(200).json({
      success: true,
      team: {
        ...team.toObject(),
        playerCount
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
