import Player from '../models/Player.js';
import Team from '../models/Team.js';
import Match from '../models/Match.js';
import { getFileUrl } from '../middleware/upload.js';

// Helper function to compute player statistics from matches
const computePlayerStats = (playerId, matches) => {
  const playerIdStr = playerId.toString();
  let matchesPlayed = 0;
  let goals = 0;
  let assists = 0;
  let yellowCards = 0;
  let redCards = 0;

  matches.forEach(match => {
    // Check if player was in starting lineup (non-substitute)
    const wasStarter = match.lineup?.some(l =>
      !l.isSubstitute && ((l.player?._id?.toString() || l.player?.toString()) === playerIdStr)
    );
    // Check if player came on as substitute
    const cameAsSubstitute = match.substitutions?.some(s =>
      (s.playerIn?._id?.toString() || s.playerIn?.toString()) === playerIdStr
    );

    if (wasStarter || cameAsSubstitute) {
      matchesPlayed++;
    }

    // Count goals
    match.goals?.forEach(g => {
      if ((g.player?._id?.toString() || g.player?.toString()) === playerIdStr) {
        goals++;
      }
      if ((g.assist?._id?.toString() || g.assist?.toString()) === playerIdStr) {
        assists++;
      }
    });

    // Count cards
    match.cards?.forEach(c => {
      if ((c.player?._id?.toString() || c.player?.toString()) === playerIdStr) {
        if (c.type === 'yellow') yellowCards++;
        if (c.type === 'red' || c.type === 'second_yellow') redCards++;
      }
    });
  });

  return { matchesPlayed, goals, assists, yellowCards, redCards };
};

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

    // For coaches, show their teams' players
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

    // Get completed matches for statistics calculation
    const teamIds = [...new Set(players.map(p => p.team?._id?.toString() || p.team?.toString()).filter(Boolean))];
    const completedMatches = await Match.find({
      team: { $in: teamIds },
      status: 'completed'
    });

    // Compute real statistics for each player
    const playersWithStats = players.map(player => {
      const playerObj = player.toObject();
      const teamMatches = completedMatches.filter(m =>
        (m.team?._id?.toString() || m.team?.toString()) === (player.team?._id?.toString() || player.team?.toString())
      );
      const computedStats = computePlayerStats(player._id, teamMatches);

      // Override stored statistics with computed values
      playerObj.statistics = {
        ...playerObj.statistics,
        ...computedStats
      };

      return playerObj;
    });

    res.status(200).json({
      success: true,
      count: players.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      players: playersWithStats
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

    // Check authorization for coaches (support multiple teams)
    if (req.user.role === 'coach') {
      const coachTeamIds = req.user.teams?.length > 0
        ? req.user.teams.map(t => (t._id || t).toString())
        : (req.user.team ? [(req.user.team._id || req.user.team).toString()] : []);

      if (!coachTeamIds.includes(player.team._id.toString())) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this player'
        });
      }
    }

    // Calculate real statistics from completed matches
    const playerId = player._id.toString();
    const matches = await Match.find({
      team: player.team._id,
      status: 'completed'
    });

    let matchesPlayed = 0;
    let goals = 0;
    let assists = 0;
    let yellowCards = 0;
    let redCards = 0;
    let totalRating = 0;
    let ratedMatches = 0;

    matches.forEach(match => {
      // Check if player was in starting lineup (non-substitute)
      const wasStarter = match.lineup?.some(l =>
        !l.isSubstitute && ((l.player?._id?.toString() || l.player?.toString()) === playerId)
      );
      // Check if player came on as substitute
      const cameAsSubstitute = match.substitutions?.some(s =>
        (s.playerIn?._id?.toString() || s.playerIn?.toString()) === playerId
      );

      if (wasStarter || cameAsSubstitute) {
        matchesPlayed++;
      }

      // Count goals
      match.goals?.forEach(g => {
        if ((g.player?._id?.toString() || g.player?.toString()) === playerId) {
          goals++;
        }
        if ((g.assist?._id?.toString() || g.assist?.toString()) === playerId) {
          assists++;
        }
      });

      // Count cards
      match.cards?.forEach(c => {
        if ((c.player?._id?.toString() || c.player?.toString()) === playerId) {
          if (c.type === 'yellow') yellowCards++;
          if (c.type === 'red' || c.type === 'second_yellow') redCards++;
        }
      });

      // Average rating
      const playerRating = match.playerRatings?.find(r =>
        (r.player?._id?.toString() || r.player?.toString()) === playerId
      );
      if (playerRating && playerRating.rating > 0) {
        totalRating += playerRating.rating;
        ratedMatches++;
      }
    });

    // Update player statistics with computed values
    const computedStats = {
      matchesPlayed,
      goals,
      assists,
      yellowCards,
      redCards,
      averageRating: ratedMatches > 0 ? (totalRating / ratedMatches).toFixed(1) : null
    };

    // Merge stored and computed statistics (computed takes priority)
    const playerObj = player.toObject();
    playerObj.statistics = {
      ...playerObj.statistics,
      ...computedStats
    };

    res.status(200).json({
      success: true,
      player: playerObj
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

// @desc    Get player statistics from matches
// @route   GET /api/players/statistics
// @access  Private
export const getPlayerStatistics = async (req, res) => {
  try {
    const { team } = req.query;

    // Build player query
    const playerQuery = { isActive: true };

    // For coaches, filter by their teams
    if (req.user.role === 'coach') {
      const coachTeamIds = req.user.teams?.length > 0
        ? req.user.teams.map(t => t._id || t)
        : (req.user.team ? [req.user.team._id || req.user.team] : []);

      if (team && coachTeamIds.some(id => id.toString() === team)) {
        playerQuery.team = team;
      } else if (coachTeamIds.length > 0) {
        playerQuery.team = { $in: coachTeamIds };
      }
    } else if (team) {
      playerQuery.team = team;
    }

    // Get all players
    const players = await Player.find(playerQuery)
      .populate('team', 'name ageCategory')
      .sort({ lastName: 1 });

    // Get all completed matches
    const matchQuery = { status: 'completed' };
    if (playerQuery.team) {
      matchQuery.team = playerQuery.team;
    }

    const matches = await Match.find(matchQuery);

    // Calculate statistics for each player
    const playerStats = players.map(player => {
      const playerId = player._id.toString();

      let matchesPlayed = 0;
      let goals = 0;
      let assists = 0;
      let yellowCards = 0;
      let redCards = 0;
      let totalRating = 0;
      let ratedMatches = 0;

      matches.forEach(match => {
        // Check if player was in lineup or substitutes
        const wasInLineup = match.lineup?.some(l =>
          (l.player?._id?.toString() || l.player?.toString()) === playerId
        );
        const cameAsSubstitute = match.substitutions?.some(s =>
          (s.playerIn?._id?.toString() || s.playerIn?.toString()) === playerId
        );

        if (wasInLineup || cameAsSubstitute) {
          matchesPlayed++;
        }

        // Count goals
        match.goals?.forEach(g => {
          if ((g.player?._id?.toString() || g.player?.toString()) === playerId) {
            goals++;
          }
          if ((g.assist?._id?.toString() || g.assist?.toString()) === playerId) {
            assists++;
          }
        });

        // Count cards
        match.cards?.forEach(c => {
          if ((c.player?._id?.toString() || c.player?.toString()) === playerId) {
            if (c.type === 'yellow' || c.type === 'second_yellow') {
              yellowCards++;
            }
            if (c.type === 'red' || c.type === 'second_yellow') {
              redCards++;
            }
          }
        });

        // Average rating
        const playerRating = match.playerRatings?.find(r =>
          (r.player?._id?.toString() || r.player?.toString()) === playerId
        );
        if (playerRating && playerRating.rating > 0) {
          totalRating += playerRating.rating;
          ratedMatches++;
        }
      });

      return {
        _id: player._id,
        firstName: player.firstName,
        lastName: player.lastName,
        jerseyNumber: player.jerseyNumber,
        position: player.position,
        photo: player.photo,
        team: player.team,
        matchStats: {
          matchesPlayed,
          goals,
          assists,
          yellowCards,
          redCards,
          averageRating: ratedMatches > 0 ? (totalRating / ratedMatches).toFixed(1) : null
        }
      };
    });

    // Sort by goals then assists
    playerStats.sort((a, b) => {
      if (b.matchStats.goals !== a.matchStats.goals) {
        return b.matchStats.goals - a.matchStats.goals;
      }
      return b.matchStats.assists - a.matchStats.assists;
    });

    res.status(200).json({
      success: true,
      count: playerStats.length,
      players: playerStats
    });
  } catch (error) {
    console.error('Get player statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
