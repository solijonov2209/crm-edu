import express from 'express';
import {
  exportPlayersExcel,
  exportPlayersPDF,
  exportTrainingsExcel,
  exportMatchPDF,
  exportTeamStatsExcel
} from '../controllers/export.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get('/players/excel', exportPlayersExcel);
router.get('/players/pdf', exportPlayersPDF);
router.get('/trainings/excel', exportTrainingsExcel);
router.get('/match/:id/pdf', exportMatchPDF);
router.get('/team/:id/stats', exportTeamStatsExcel);

export default router;
