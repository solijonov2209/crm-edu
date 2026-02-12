import Training from '../models/Training.js';
import Player from '../models/Player.js';
import { getFileUrl } from '../middleware/upload.js';

// Helper function to get coach's team IDs
const getCoachTeamIds = (user) => {
  if (user.role !== 'coach') return null;
  return user.teams?.length > 0
    ? user.teams.map(t => (t._id || t).toString())
    : (user.team ? [(user.team._id || user.team).toString()] : []);
};

// @desc    Get all trainings
// @route   GET /api/trainings
// @access  Private
export const getTrainings = async (req, res) => {
  try {
    const {
      team,
      status,
      type,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    const query = {};

    // For coaches, only show their teams' trainings
    if (req.user.role === 'coach') {
      const coachTeamIds = getCoachTeamIds(req.user);
      if (team && coachTeamIds.includes(team)) {
        query.team = team;
      } else if (coachTeamIds.length > 0) {
        query.team = { $in: coachTeamIds };
      }
    } else if (team) {
      query.team = team;
    }

    if (status) query.status = status;
    if (type) query.type = type;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const total = await Training.countDocuments(query);
    const trainings = await Training.find(query)
      .populate('team', 'name ageCategory')
      .populate('coach', 'firstName lastName')
      .populate('attendance.player', 'firstName lastName jerseyNumber position photo')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: trainings.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      trainings
    });
  } catch (error) {
    console.error('Get trainings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single training
// @route   GET /api/trainings/:id
// @access  Private
export const getTraining = async (req, res) => {
  try {
    const training = await Training.findById(req.params.id)
      .populate('team', 'name ageCategory')
      .populate('coach', 'firstName lastName photo')
      .populate('attendance.player', 'firstName lastName jerseyNumber position photo');

    if (!training) {
      return res.status(404).json({
        success: false,
        message: 'Training not found'
      });
    }

    // Check authorization for coaches
    if (req.user.role === 'coach') {
      const coachTeamIds = getCoachTeamIds(req.user);
      if (!coachTeamIds.includes(training.team._id.toString())) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this training'
        });
      }
    }

    res.status(200).json({
      success: true,
      training
    });
  } catch (error) {
    console.error('Get training error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create training
// @route   POST /api/trainings
// @access  Private
export const createTraining = async (req, res) => {
  try {
    const trainingData = { ...req.body };

    // For coaches, validate team access
    if (req.user.role === 'coach') {
      const coachTeamIds = getCoachTeamIds(req.user);
      // If team is specified in body, validate it's in coach's teams
      if (trainingData.team && !coachTeamIds.includes(trainingData.team.toString())) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to create training for this team'
        });
      }
      // If no team specified, use first team
      if (!trainingData.team && coachTeamIds.length > 0) {
        trainingData.team = coachTeamIds[0];
      }
    }

    trainingData.coach = req.user._id;

    // Get all active players from the team for attendance
    const players = await Player.find({
      team: trainingData.team,
      isActive: true
    });

    // Initialize attendance with all players as pending
    trainingData.attendance = players.map(player => ({
      player: player._id,
      status: 'present'
    }));

    const training = await Training.create(trainingData);

    const populatedTraining = await Training.findById(training._id)
      .populate('team', 'name ageCategory')
      .populate('coach', 'firstName lastName')
      .populate('attendance.player', 'firstName lastName jerseyNumber position photo');

    res.status(201).json({
      success: true,
      training: populatedTraining
    });
  } catch (error) {
    console.error('Create training error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Update training
// @route   PUT /api/trainings/:id
// @access  Private
export const updateTraining = async (req, res) => {
  try {
    let training = await Training.findById(req.params.id);

    if (!training) {
      return res.status(404).json({
        success: false,
        message: 'Training not found'
      });
    }

    // Check authorization for coaches
    if (req.user.role === 'coach') {
      const coachTeamIds = getCoachTeamIds(req.user);
      if (!coachTeamIds.includes(training.team.toString())) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this training'
        });
      }
    }

    training = await Training.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('team', 'name ageCategory')
      .populate('coach', 'firstName lastName')
      .populate('attendance.player', 'firstName lastName jerseyNumber position photo');

    res.status(200).json({
      success: true,
      training
    });
  } catch (error) {
    console.error('Update training error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete training
// @route   DELETE /api/trainings/:id
// @access  Private
export const deleteTraining = async (req, res) => {
  try {
    const training = await Training.findById(req.params.id);

    if (!training) {
      return res.status(404).json({
        success: false,
        message: 'Training not found'
      });
    }

    // Check authorization for coaches
    if (req.user.role === 'coach') {
      const coachTeamIds = getCoachTeamIds(req.user);
      if (!coachTeamIds.includes(training.team.toString())) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this training'
        });
      }
    }

    await training.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Training deleted successfully'
    });
  } catch (error) {
    console.error('Delete training error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update attendance for a training
// @route   PUT /api/trainings/:id/attendance
// @access  Private
export const updateAttendance = async (req, res) => {
  try {
    const { attendance } = req.body;

    const training = await Training.findById(req.params.id);

    if (!training) {
      return res.status(404).json({
        success: false,
        message: 'Training not found'
      });
    }

    training.attendance = attendance;
    await training.save();

    const populatedTraining = await Training.findById(training._id)
      .populate('team', 'name ageCategory')
      .populate('coach', 'firstName lastName')
      .populate('attendance.player', 'firstName lastName jerseyNumber position photo');

    res.status(200).json({
      success: true,
      training: populatedTraining
    });
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Upload training photos
// @route   POST /api/trainings/:id/photos
// @access  Private
export const uploadTrainingPhotos = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload files'
      });
    }

    const training = await Training.findById(req.params.id);

    if (!training) {
      return res.status(404).json({
        success: false,
        message: 'Training not found'
      });
    }

    const newPhotos = req.files.map(file => ({
      url: getFileUrl(req, file.filename, 'photos'),
      caption: '',
      uploadedAt: new Date()
    }));

    training.photos.push(...newPhotos);
    await training.save();

    res.status(200).json({
      success: true,
      training
    });
  } catch (error) {
    console.error('Upload photos error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Upload training video
// @route   POST /api/trainings/:id/video
// @access  Private
export const uploadTrainingVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    const training = await Training.findById(req.params.id);

    if (!training) {
      return res.status(404).json({
        success: false,
        message: 'Training not found'
      });
    }

    training.videos.push({
      url: getFileUrl(req, req.file.filename, 'videos'),
      caption: req.body.caption || '',
      uploadedAt: new Date()
    });

    await training.save();

    res.status(200).json({
      success: true,
      training
    });
  } catch (error) {
    console.error('Upload video error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Upload training plan document (PDF/DOCX)
// @route   POST /api/trainings/:id/plan
// @access  Private (Coach only)
export const uploadTrainingPlan = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    const training = await Training.findById(req.params.id);

    if (!training) {
      return res.status(404).json({
        success: false,
        message: 'Training not found'
      });
    }

    // Check authorization for coaches
    if (req.user.role === 'coach') {
      const coachTeamIds = getCoachTeamIds(req.user);
      if (!coachTeamIds.includes(training.team.toString())) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this training'
        });
      }
    }

    training.trainingPlan = {
      url: getFileUrl(req, req.file.filename, 'documents'),
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date()
    };

    await training.save();

    const populatedTraining = await Training.findById(training._id)
      .populate('team', 'name ageCategory')
      .populate('coach', 'firstName lastName');

    res.status(200).json({
      success: true,
      training: populatedTraining
    });
  } catch (error) {
    console.error('Upload training plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get training statistics for a team
// @route   GET /api/trainings/stats/:teamId
// @access  Private
export const getTrainingStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const teamId = req.params.teamId;

    const query = { team: teamId };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const trainings = await Training.find(query);

    const stats = {
      total: trainings.length,
      completed: trainings.filter(t => t.status === 'completed').length,
      cancelled: trainings.filter(t => t.status === 'cancelled').length,
      averageAttendance: 0,
      byType: {},
      byMonth: {}
    };

    let totalAttendancePercentage = 0;
    trainings.forEach(training => {
      // Count by type
      stats.byType[training.type] = (stats.byType[training.type] || 0) + 1;

      // Count by month
      const month = new Date(training.date).toISOString().slice(0, 7);
      stats.byMonth[month] = (stats.byMonth[month] || 0) + 1;

      // Calculate attendance
      if (training.attendance && training.attendance.length > 0) {
        const present = training.attendance.filter(a =>
          a.status === 'present' || a.status === 'late'
        ).length;
        totalAttendancePercentage += (present / training.attendance.length) * 100;
      }
    });

    if (trainings.length > 0) {
      stats.averageAttendance = Math.round(totalAttendancePercentage / trainings.length);
    }

    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get training stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
