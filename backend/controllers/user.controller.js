import User from '../models/User.js';
import Team from '../models/Team.js';
import { getFileUrl } from '../middleware/upload.js';

// @desc    Get all users (coaches)
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = async (req, res) => {
  try {
    const { role, isActive, search, page = 1, limit = 10 } = req.query;

    const query = {};

    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .populate('team', 'name ageCategory')
      .populate('teams', 'name ageCategory')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('team', 'name ageCategory')
      .populate('teams', 'name ageCategory');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create user (coach)
// @route   POST /api/users
// @access  Private/Admin
export const createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, phone, team, teams } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Support both single team and multiple teams
    const teamsArray = teams || (team ? [team] : []);

    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role: role || 'coach',
      phone,
      team: teamsArray[0] || null, // Keep first team for backward compatibility
      teams: teamsArray
    });

    // Update team's coach field for all assigned teams
    for (const teamId of teamsArray) {
      await Team.findByIdAndUpdate(teamId, { $addToSet: { coaches: user._id } });
    }

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      user: userResponse
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, role, team, teams, isActive } = req.body;

    let user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check email uniqueness if changed
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
    }

    // Support both single team and multiple teams
    const newTeams = teams || (team ? [team] : []);
    const oldTeams = user.teams?.map(t => t.toString()) || [];

    // Remove user from teams they're no longer assigned to
    for (const oldTeamId of oldTeams) {
      if (!newTeams.includes(oldTeamId)) {
        await Team.findByIdAndUpdate(oldTeamId, { $pull: { coaches: user._id } });
      }
    }

    // Add user to new teams
    for (const newTeamId of newTeams) {
      if (!oldTeams.includes(newTeamId)) {
        await Team.findByIdAndUpdate(newTeamId, { $addToSet: { coaches: user._id } });
      }
    }

    user = await User.findByIdAndUpdate(
      req.params.id,
      {
        firstName, lastName, email, phone, role, isActive,
        team: newTeams[0] || null, // Keep first team for backward compatibility
        teams: newTeams
      },
      { new: true, runValidators: true }
    ).populate('team').populate('teams');

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting super admin
    if (user.role === 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete super admin'
      });
    }

    // Remove from all assigned teams' coaches array
    if (user.teams?.length > 0) {
      for (const teamId of user.teams) {
        await Team.findByIdAndUpdate(teamId, { $pull: { coaches: user._id } });
      }
    }
    // Also clear legacy single team coach field if this user was the coach
    if (user.team) {
      await Team.findByIdAndUpdate(user.team, { coach: null });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Reset user password
// @route   PUT /api/users/:id/reset-password
// @access  Private/Admin
export const resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Upload user photo
// @route   PUT /api/users/:id/photo
// @access  Private
export const uploadUserPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { photo: getFileUrl(req, req.file.filename, 'photos') },
      { new: true }
    );

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
