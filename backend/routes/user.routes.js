import express from 'express';
import { body } from 'express-validator';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  uploadUserPhoto
} from '../controllers/user.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uploadPhoto, handleUploadError } from '../middleware/upload.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('super_admin'));

router.route('/')
  .get(getUsers)
  .post(
    [
      body('firstName').trim().isLength({ min: 1, max: 50 }).withMessage('First name is required'),
      body('lastName').trim().isLength({ min: 1, max: 50 }).withMessage('Last name is required'),
      body('email').isEmail().withMessage('Please provide a valid email'),
      body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
      body('role').optional().isIn(['super_admin', 'coach'])
    ],
    validate,
    createUser
  );

router.route('/:id')
  .get(getUser)
  .put(
    [
      body('firstName').optional().trim().isLength({ min: 1, max: 50 }),
      body('lastName').optional().trim().isLength({ min: 1, max: 50 }),
      body('email').optional().isEmail(),
      body('role').optional().isIn(['super_admin', 'coach']),
      body('isActive').optional().isBoolean()
    ],
    validate,
    updateUser
  )
  .delete(deleteUser);

router.put(
  '/:id/reset-password',
  [
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  validate,
  resetPassword
);

router.put('/:id/photo', uploadPhoto, handleUploadError, uploadUserPhoto);

export default router;
