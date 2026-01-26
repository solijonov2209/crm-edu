import express from 'express';
import { body } from 'express-validator';
import {
  login,
  getMe,
  updateProfile,
  updatePassword,
  logout
} from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// Public routes
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validate,
  login
);

// Protected routes
router.use(protect);

router.get('/me', getMe);
router.post('/logout', logout);

router.put(
  '/profile',
  [
    body('firstName').optional().trim().isLength({ min: 1, max: 50 }),
    body('lastName').optional().trim().isLength({ min: 1, max: 50 }),
    body('phone').optional().trim(),
    body('preferredLanguage').optional().isIn(['uz', 'ru', 'en'])
  ],
  validate,
  updateProfile
);

router.put(
  '/password',
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
  ],
  validate,
  updatePassword
);

export default router;
