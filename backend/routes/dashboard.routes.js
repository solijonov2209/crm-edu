import express from 'express';
import {
  getAdminDashboard,
  getCoachDashboard,
  getPlayerPerformance
} from '../controllers/dashboard.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get('/admin', authorize('super_admin'), getAdminDashboard);
router.get('/coach', getCoachDashboard);
router.get('/player/:id/performance', getPlayerPerformance);

export default router;
