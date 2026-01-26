import express from 'express';
import { body } from 'express-validator';
import {
  getMatches,
  getMatch,
  createMatch,
  updateMatch,
  deleteMatch,
  updateLineup,
  addGoal,
  addCard,
  addSubstitution,
  completeMatch,
  getUpcomingMatches,
  getMatchStats
} from '../controllers/match.controller.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.route('/')
  .get(getMatches)
  .post(
    [
      body('team').isMongoId().withMessage('Valid team ID is required'),
      body('opponent.name').trim().notEmpty().withMessage('Opponent name is required'),
      body('matchDate').isISO8601().withMessage('Valid match date is required'),
      body('kickoffTime').notEmpty().withMessage('Kickoff time is required')
    ],
    validate,
    createMatch
  );

router.get('/upcoming', getUpcomingMatches);
router.get('/stats/:teamId', getMatchStats);

router.route('/:id')
  .get(getMatch)
  .put(
    [
      body('matchDate').optional().isISO8601(),
      body('status').optional().isIn(['scheduled', 'lineup_set', 'in_progress', 'half_time', 'completed', 'postponed', 'cancelled'])
    ],
    validate,
    updateMatch
  )
  .delete(deleteMatch);

router.put('/:id/lineup', updateLineup);
router.post('/:id/goals', addGoal);
router.post('/:id/cards', addCard);
router.post('/:id/substitutions', addSubstitution);
router.put('/:id/complete', completeMatch);

export default router;
