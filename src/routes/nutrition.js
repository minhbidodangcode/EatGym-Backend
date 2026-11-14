import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { calculateNutritionBaseline } from '../nutrition/calculator.js';
import { validateCalculation } from '../validation.js';
import {
  calculateDailyCarbCyclingMacros,
  calculateWeeklyCarbCyclingPlan,
  DEFAULT_WEEKLY_PRESETS
} from '../nutrition/carb-cycling.js';

const router = Router();
router.use(requireAuth);

// A non-persistent calculation preview. PUT /api/profile persists its result.
router.post('/calculate', (req, res, next) => {
  try {
    const input = validateCalculation(req.body);
    res.json({ calculation: calculateNutritionBaseline(input) });
  } catch (error) {
    next(error);
  }
});

// Lấy danh sách chu kỳ mẫu Carb Cycling tuần
router.get('/carb-cycling/presets', (req, res) => {
  res.json({ presets: DEFAULT_WEEKLY_PRESETS });
});

// Tính toán kế hoạch Carb Cycling tuần
router.post('/carb-cycling/plan', (req, res, next) => {
  try {
    const { baselineKcal = 2200, schedule, weightKg = 70 } = req.body || {};
    const plan = calculateWeeklyCarbCyclingPlan({
      baselineKcal: Number(baselineKcal) || 2200,
      schedule,
      weightKg: Number(weightKg) || 70,
    });
    res.json(plan);
  } catch (error) {
    next(error);
  }
});

export default router;
