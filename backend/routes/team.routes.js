import express from 'express';
import { body } from 'express-validator';
import {
  getTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
  uploadTeamLogo,
  updateTeamStatistics
} from '../controllers/team.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uploadPhoto, handleUploadError } from '../middleware/upload.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.route('/')
  .get(getTeams)
  .post(
    authorize('super_admin'),
    [
      body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Team name is required'),
      body('ageCategory').trim().notEmpty().withMessage('Age category is required'),
      body('birthYear').isInt({ min: 2000 }).withMessage('Valid birth year is required')
    ],
    validate,
    createTeam
  );

router.route('/:id')
  .get(getTeam)
  .put(
    authorize('super_admin'),
    [
      body('name').optional().trim().isLength({ min: 1, max: 100 }),
      body('ageCategory').optional().trim(),
      body('birthYear').optional().isInt({ min: 2000 }),
      body('isActive').optional().isBoolean()
    ],
    validate,
    updateTeam
  )
  .delete(authorize('super_admin'), deleteTeam);

router.put('/:id/logo', authorize('super_admin'), uploadPhoto, handleUploadError, uploadTeamLogo);
router.put('/:id/statistics', updateTeamStatistics);

export default router;
