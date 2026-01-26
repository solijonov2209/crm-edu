import User from '../models/User.js';
import Team from '../models/Team.js';
import Player from '../models/Player.js';
import Training from '../models/Training.js';
import Match from '../models/Match.js';

// @desc    Get dashboard statistics for Super Admin
// @route   GET /api/dashboard/admin
// @access  Private/Admin
export const getAdminDashboard = async (req, res) => {
  try {
    // Get counts
    const [
      totalTeams,
      totalPlayers,
      totalCoaches,
      activeTeams,
      activePlayers,
      injuredPlayers
    ] = await Promise.all([
      Team.countDocuments(),
      Player.countDocuments(),
      User.countDocuments({ role: 'coach' }),
      Team.countDocuments({ isActive: true }),
      Player.countDocuments({ isActive: true }),
      Player.countDocuments({ isInjured: true })
    ]);

    // Get recent trainings
    const recentTrainings = await Training.find()
      .populate('team', 'name ageCategory')
      .sort({ date: -1 })
      .limit(5);

    // Get upcoming matches
    const upcomingMatches = await Match.find({
      matchDate: { $gte: new Date() },
      status: { $in: ['scheduled', 'lineup_set'] }
    })
      .populate('team', 'name ageCategory')
      .sort({ matchDate: 1 })
      .limit(5);

    // Get recent match results
    const recentMatches = await Match.find({ status: 'completed' })
      .populate('team', 'name ageCategory')
      .sort({ matchDate: -1 })
      .limit(5);

    // Get teams with statistics
    const teamsWithStats = await Team.find({ isActive: true })
      .select('name ageCategory birthYear statistics')
      .sort({ birthYear: -1 });

    // Calculate overall statistics
    const allMatches = await Match.find({ status: 'completed' });
    let totalWins = 0, totalDraws = 0, totalLosses = 0, totalGoals = 0;

    allMatches.forEach(match => {
      const ourScore = match.isHome ? match.score.home : match.score.away;
      const theirScore = match.isHome ? match.score.away : match.score.home;
      totalGoals += ourScore;
      if (ourScore > theirScore) totalWins++;
      else if (ourScore < theirScore) totalLosses++;
      else totalDraws++;
    });

    // Get training statistics for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTrainingStats = await Training.find({
      date: { $gte: thirtyDaysAgo }
    });

    let totalAttendance = 0;
    let attendanceCount = 0;
    recentTrainingStats.forEach(training => {
      if (training.attendance && training.attendance.length > 0) {
        const present = training.attendance.filter(a =>
          a.status === 'present' || a.status === 'late'
        ).length;
        totalAttendance += (present / training.attendance.length) * 100;
        attendanceCount++;
      }
    });

    const averageAttendance = attendanceCount > 0
      ? Math.round(totalAttendance / attendanceCount)
      : 0;

    // Get top scorers
    const topScorers = await Player.find({ 'statistics.goals': { $gt: 0 } })
      .populate('team', 'name')
      .sort({ 'statistics.goals': -1 })
      .limit(10)
      .select('firstName lastName photo statistics.goals statistics.matchesPlayed team');

    // Get player position distribution
    const positionDistribution = await Player.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$position', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get monthly training data
    const monthlyTrainingData = await Training.aggregate([
      {
        $match: {
          date: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        counts: {
          totalTeams,
          activeTeams,
          totalPlayers,
          activePlayers,
          injuredPlayers,
          totalCoaches
        },
        matchStats: {
          total: allMatches.length,
          wins: totalWins,
          draws: totalDraws,
          losses: totalLosses,
          goalsScored: totalGoals,
          winRate: allMatches.length > 0 ? Math.round((totalWins / allMatches.length) * 100) : 0
        },
        trainingStats: {
          totalLast30Days: recentTrainingStats.length,
          averageAttendance
        },
        recentTrainings,
        upcomingMatches,
        recentMatches,
        teamsWithStats,
        topScorers,
        positionDistribution,
        monthlyTrainingData
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get dashboard statistics for Coach
// @route   GET /api/dashboard/coach
// @access  Private
export const getCoachDashboard = async (req, res) => {
  try {
    if (!req.user.team) {
      return res.status(400).json({
        success: false,
        message: 'You are not assigned to any team'
      });
    }

    const teamId = req.user.team._id;

    // Get team info
    const team = await Team.findById(teamId)
      .populate('coach', 'firstName lastName')
      .populate('assistantCoach', 'firstName lastName');

    // Get player counts
    const [totalPlayers, injuredPlayers] = await Promise.all([
      Player.countDocuments({ team: teamId, isActive: true }),
      Player.countDocuments({ team: teamId, isInjured: true })
    ]);

    // Get all players with basic info
    const players = await Player.find({ team: teamId, isActive: true })
      .select('firstName lastName position jerseyNumber photo physicalCondition isInjured statistics ratings')
      .sort({ position: 1, lastName: 1 });

    // Get recent trainings
    const recentTrainings = await Training.find({ team: teamId })
      .populate('attendance.player', 'firstName lastName')
      .sort({ date: -1 })
      .limit(5);

    // Get upcoming matches
    const upcomingMatches = await Match.find({
      team: teamId,
      matchDate: { $gte: new Date() },
      status: { $in: ['scheduled', 'lineup_set'] }
    })
      .sort({ matchDate: 1 })
      .limit(5);

    // Get recent match results
    const recentMatches = await Match.find({
      team: teamId,
      status: 'completed'
    })
      .sort({ matchDate: -1 })
      .limit(5);

    // Training statistics for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trainingsLast30Days = await Training.find({
      team: teamId,
      date: { $gte: thirtyDaysAgo }
    });

    let totalAttendance = 0;
    let attendanceCount = 0;
    trainingsLast30Days.forEach(training => {
      if (training.attendance && training.attendance.length > 0) {
        const present = training.attendance.filter(a =>
          a.status === 'present' || a.status === 'late'
        ).length;
        totalAttendance += (present / training.attendance.length) * 100;
        attendanceCount++;
      }
    });

    // Get top performers (by goals)
    const topScorers = await Player.find({
      team: teamId,
      'statistics.goals': { $gt: 0 }
    })
      .sort({ 'statistics.goals': -1 })
      .limit(5)
      .select('firstName lastName photo statistics.goals');

    // Get recent form
    const completedMatches = await Match.find({
      team: teamId,
      status: 'completed'
    })
      .sort({ matchDate: -1 })
      .limit(5);

    const recentForm = completedMatches.map(match => {
      const ourScore = match.isHome ? match.score.home : match.score.away;
      const theirScore = match.isHome ? match.score.away : match.score.home;
      if (ourScore > theirScore) return 'W';
      if (ourScore < theirScore) return 'L';
      return 'D';
    });

    res.status(200).json({
      success: true,
      data: {
        team,
        counts: {
          totalPlayers,
          injuredPlayers,
          availablePlayers: totalPlayers - injuredPlayers
        },
        players,
        trainingStats: {
          totalLast30Days: trainingsLast30Days.length,
          averageAttendance: attendanceCount > 0
            ? Math.round(totalAttendance / attendanceCount)
            : 0
        },
        recentTrainings,
        upcomingMatches,
        recentMatches,
        topScorers,
        recentForm
      }
    });
  } catch (error) {
    console.error('Coach dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get player performance data
// @route   GET /api/dashboard/player/:id/performance
// @access  Private
export const getPlayerPerformance = async (req, res) => {
  try {
    const player = await Player.findById(req.params.id)
      .populate('team', 'name');

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    // Get all trainings where player was present
    const trainings = await Training.find({
      'attendance.player': player._id
    }).sort({ date: 1 });

    // Extract performance data over time
    const performanceOverTime = trainings.map(training => {
      const attendance = training.attendance.find(
        a => a.player.toString() === player._id.toString()
      );
      return {
        date: training.date,
        rating: attendance?.rating || null,
        performance: attendance?.performance || null
      };
    }).filter(p => p.rating !== null);

    // Get match performances
    const matches = await Match.find({
      'playerRatings.player': player._id,
      status: 'completed'
    }).sort({ matchDate: 1 });

    const matchPerformance = matches.map(match => {
      const rating = match.playerRatings.find(
        r => r.player.toString() === player._id.toString()
      );
      return {
        date: match.matchDate,
        opponent: match.opponent.name,
        rating: rating?.rating || null,
        goals: match.goals.filter(g => g.player.toString() === player._id.toString()).length,
        assists: match.goals.filter(g => g.assist?.toString() === player._id.toString()).length
      };
    });

    // Calculate progression (compare current ratings to 3 months ago)
    const threeMonthsAgo = trainings.filter(t =>
      new Date(t.date) >= new Date(new Date().setMonth(new Date().getMonth() - 3))
    );

    let progressionData = null;
    if (threeMonthsAgo.length >= 5) {
      const recentRatings = threeMonthsAgo.slice(-5);
      const olderRatings = threeMonthsAgo.slice(0, 5);

      const avgRecent = recentRatings.reduce((sum, t) => {
        const att = t.attendance.find(a => a.player.toString() === player._id.toString());
        return sum + (att?.rating || 0);
      }, 0) / recentRatings.length;

      const avgOlder = olderRatings.reduce((sum, t) => {
        const att = t.attendance.find(a => a.player.toString() === player._id.toString());
        return sum + (att?.rating || 0);
      }, 0) / olderRatings.length;

      progressionData = {
        trend: avgRecent > avgOlder ? 'improving' : avgRecent < avgOlder ? 'declining' : 'stable',
        change: Math.round((avgRecent - avgOlder) * 10) / 10
      };
    }

    res.status(200).json({
      success: true,
      data: {
        player,
        performanceOverTime,
        matchPerformance,
        progressionData,
        totalTrainings: trainings.length,
        attendanceRate: trainings.length > 0
          ? Math.round((trainings.filter(t => {
              const att = t.attendance.find(a => a.player.toString() === player._id.toString());
              return att && (att.status === 'present' || att.status === 'late');
            }).length / trainings.length) * 100)
          : 0
      }
    });
  } catch (error) {
    console.error('Get player performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
