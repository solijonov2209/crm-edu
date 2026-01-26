import Player from '../models/Player.js';
import Team from '../models/Team.js';
import { getFileUrl } from '../middleware/upload.js';

// @desc    Get all players
// @route   GET /api/players
// @access  Private
export const getPlayers = async (req, res) => {
  try {
    const {
      team,
      position,
      isActive,
      isInjured,
      search,
      page = 1,
      limit = 20,
      sortBy = 'lastName',
      sortOrder = 'asc'
    } = req.query;

    const query = {};

    // For coaches, only show their team's players
    if (req.user.role === 'coach' && req.user.team) {
      query.team = req.user.team._id;
    } else if (team) {
      query.team = team;
    }

    if (position) query.position = position;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (isInjured !== undefined) query.isInjured = isInjured === 'true';
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const total = await Player.countDocuments(query);
    const players = await Player.find(query)
      .populate('team', 'name ageCategory primaryColor')
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: players.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      players
    });
  } catch (error) {
    console.error('Get players error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single player
// @route   GET /api/players/:id
// @access  Private
export const getPlayer = async (req, res) => {
  try {
    const player = await Player.findById(req.params.id)
      .populate('team', 'name ageCategory primaryColor coach');

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    // Check authorization for coaches
    if (req.user.role === 'coach' &&
        (!req.user.team || req.user.team._id.toString() !== player.team._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this player'
      });
    }

    res.status(200).json({
      success: true,
      player
    });
  } catch (error) {
    console.error('Get player error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create player
// @route   POST /api/players
// @access  Private
export const createPlayer = async (req, res) => {
  try {
    const playerData = { ...req.body };

    // For coaches, force team to be their team
    if (req.user.role === 'coach' && req.user.team) {
      playerData.team = req.user.team._id;
    }

    // Verify team exists
    const team = await Team.findById(playerData.team);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    const player = await Player.create(playerData);

    res.status(201).json({
      success: true,
      player
    });
  } catch (error) {
    console.error('Create player error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Update player
// @route   PUT /api/players/:id
// @access  Private
export const updatePlayer = async (req, res) => {
  try {
    let player = await Player.findById(req.params.id);

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    // Check authorization for coaches
    if (req.user.role === 'coach' &&
        (!req.user.team || req.user.team._id.toString() !== player.team.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this player'
      });
    }

    // Prevent coaches from changing team
    const updateData = { ...req.body };
    if (req.user.role === 'coach') {
      delete updateData.team;
    }

    player = await Player.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('team', 'name ageCategory');

    res.status(200).json({
      success: true,
      player
    });
  } catch (error) {
    console.error('Update player error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete player
// @route   DELETE /api/players/:id
// @access  Private
export const deletePlayer = async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    // Check authorization for coaches
    if (req.user.role === 'coach' &&
        (!req.user.team || req.user.team._id.toString() !== player.team.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this player'
      });
    }

    await player.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Player deleted successfully'
    });
  } catch (error) {
    console.error('Delete player error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Upload player photo
// @route   PUT /api/players/:id/photo
// @access  Private
export const uploadPlayerPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    const player = await Player.findByIdAndUpdate(
      req.params.id,
      { photo: getFileUrl(req, req.file.filename, 'photos') },
      { new: true }
    );

    res.status(200).json({
      success: true,
      player
    });
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update player ratings
// @route   PUT /api/players/:id/ratings
// @access  Private
export const updatePlayerRatings = async (req, res) => {
  try {
    const { ratings } = req.body;

    const player = await Player.findByIdAndUpdate(
      req.params.id,
      { ratings },
      { new: true, runValidators: true }
    );

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    res.status(200).json({
      success: true,
      player
    });
  } catch (error) {
    console.error('Update ratings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update player statistics
// @route   PUT /api/players/:id/statistics
// @access  Private
export const updatePlayerStatistics = async (req, res) => {
  try {
    const { statistics } = req.body;

    const player = await Player.findByIdAndUpdate(
      req.params.id,
      { statistics },
      { new: true }
    );

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    res.status(200).json({
      success: true,
      player
    });
  } catch (error) {
    console.error('Update statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update player injury status
// @route   PUT /api/players/:id/injury
// @access  Private
export const updatePlayerInjury = async (req, res) => {
  try {
    const { isInjured, injuryDetails, injuryEndDate, physicalCondition } = req.body;

    const player = await Player.findByIdAndUpdate(
      req.params.id,
      { isInjured, injuryDetails, injuryEndDate, physicalCondition },
      { new: true }
    );

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    res.status(200).json({
      success: true,
      player
    });
  } catch (error) {
    console.error('Update injury error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get players by team
// @route   GET /api/players/team/:teamId
// @access  Private
export const getPlayersByTeam = async (req, res) => {
  try {
    const players = await Player.find({
      team: req.params.teamId,
      isActive: true
    }).sort({ position: 1, lastName: 1 });

    res.status(200).json({
      success: true,
      count: players.length,
      players
    });
  } catch (error) {
    console.error('Get players by team error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
