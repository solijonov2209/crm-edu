import express from 'express';
import { body } from 'express-validator';
import {
  getTrainings,
  getTraining,
  createTraining,
  updateTraining,
  deleteTraining,
  updateAttendance,
  uploadTrainingPhotos,
  uploadTrainingVideo,
  uploadTrainingPlan,
  getTrainingStats
} from '../controllers/training.controller.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uploadPhotos, uploadVideo, uploadDocument, handleUploadError } from '../middleware/upload.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.route('/')
  .get(getTrainings)
  .post(
    [
      body('team').isMongoId().withMessage('Valid team ID is required'),
      body('date').isISO8601().withMessage('Valid date is required'),
      body('startTime').notEmpty().withMessage('Start time is required'),
      body('endTime').notEmpty().withMessage('End time is required')
    ],
    validate,
    createTraining
  );

router.get('/stats/:teamId', getTrainingStats);

router.route('/:id')
  .get(getTraining)
  .put(
    [
      body('date').optional().isISO8601(),
      body('status').optional().isIn(['scheduled', 'in_progress', 'completed', 'cancelled']),
      body('type').optional().isIn(['regular', 'tactical', 'physical', 'recovery', 'match_prep', 'friendly'])
    ],
    validate,
    updateTraining
  )
  .delete(deleteTraining);

router.put('/:id/attendance', updateAttendance);
router.post('/:id/photos', uploadPhotos, handleUploadError, uploadTrainingPhotos);
router.post('/:id/video', uploadVideo, handleUploadError, uploadTrainingVideo);
router.post('/:id/plan', uploadDocument, handleUploadError, uploadTrainingPlan);

export default router;
