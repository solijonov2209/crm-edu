import express from 'express';
import { body } from 'express-validator';
import {
  getPlayers,
  getPlayer,
  createPlayer,
  updatePlayer,
  deletePlayer,
  uploadPlayerPhoto,
  updatePlayerRatings,
  updatePlayerStatistics,
  updatePlayerInjury,
  getPlayersByTeam
} from '../controllers/player.controller.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uploadPhoto, handleUploadError } from '../middleware/upload.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.route('/')
  .get(getPlayers)
  .post(
    [
      body('firstName').trim().isLength({ min: 1, max: 50 }).withMessage('First name is required'),
      body('lastName').trim().isLength({ min: 1, max: 50 }).withMessage('Last name is required'),
      body('birthDate').isISO8601().withMessage('Valid birth date is required'),
      body('team').isMongoId().withMessage('Valid team ID is required'),
      body('position').isIn(['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST'])
        .withMessage('Valid position is required')
    ],
    validate,
    createPlayer
  );

router.get('/team/:teamId', getPlayersByTeam);

router.route('/:id')
  .get(getPlayer)
  .put(
    [
      body('firstName').optional().trim().isLength({ min: 1, max: 50 }),
      body('lastName').optional().trim().isLength({ min: 1, max: 50 }),
      body('birthDate').optional().isISO8601(),
      body('position').optional().isIn(['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST']),
      body('isActive').optional().isBoolean()
    ],
    validate,
    updatePlayer
  )
  .delete(deletePlayer);

router.put('/:id/photo', uploadPhoto, handleUploadError, uploadPlayerPhoto);
router.put('/:id/ratings', updatePlayerRatings);
router.put('/:id/statistics', updatePlayerStatistics);
router.put('/:id/injury', updatePlayerInjury);

export default router;
