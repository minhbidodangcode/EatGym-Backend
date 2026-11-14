// EatGym-Backend/src/nutrition/carb-cycling.js
// Logic tính toán chu kỳ Carb Cycling và lập kế hoạch thực đơn tuần theo ngày tập nặng / nhẹ / nghỉ.

import { roundTo } from './macro-calculator.js';

export const CARB_CYCLING_TYPES = Object.freeze({
  HEAVY: 'heavy',     // Tập nặng: Chân / Lưng / Compound
  LIGHT: 'light',     // Tập nhẹ / vừa: Ngực / Tay / Vai / Cardio
  REST: 'rest',       // Nghỉ ngơi: Hồi phục / Không tập
});

export const CARB_CYCLING_CONFIG = Object.freeze({
  [CARB_CYCLING_TYPES.HEAVY]: {
    name: 'Tập nặng',
    defaultFocus: 'Chân & Lưng (Compound nặng)',
    carbLevel: 'high',
    carbLevelName: 'High Carb',
    carbBadge: '🔥 High Carb (+Tinh bột)',
    kcalMultiplier: 1.10, // +10% calo
    carbPct: 0.50,        // 50% calo từ Carb
    proteinPct: 0.25,     // 25% calo từ Protein
    fatPct: 0.25,         // 25% calo từ Fat
    description: 'Tăng lượng tinh bột nạp đầy glycogen cơ bắp, hỗ trợ tối đa sức mạnh và phục hồi sau buổi tập nặng (Chân/Lưng).',
  },
  [CARB_CYCLING_TYPES.LIGHT]: {
    name: 'Tập nhẹ',
    defaultFocus: 'Ngực, Tay & Vai (Cardio vừa)',
    carbLevel: 'moderate',
    carbLevelName: 'Moderate Carb',
    carbBadge: '⚡ Moderate Carb (Vừa phải)',
    kcalMultiplier: 1.00, // 100% baseline calo
    carbPct: 0.35,        // 35% calo từ Carb
    proteinPct: 0.30,     // 30% calo từ Protein
    fatPct: 0.35,         // 35% calo từ Fat
    description: 'Giữ lượng tinh bột ở mức vừa phải, cung cấp đủ năng lượng cho buổi tập nhẹ và duy trì độ săn chắc.',
  },
  [CARB_CYCLING_TYPES.REST]: {
    name: 'Nghỉ ngơi',
    defaultFocus: 'Phục hồi cơ bắp & Đốt mỡ',
    carbLevel: 'low',
    carbLevelName: 'Low Carb',
    carbBadge: '🌿 Low Carb (Hạ thấp tinh bột)',
    kcalMultiplier: 0.88, // -12% calo ngày nghỉ
    carbPct: 0.20,        // 20% calo từ Carb
    proteinPct: 0.35,     // 35% calo từ Protein
    fatPct: 0.45,         // 45% calo từ Fat
    description: 'Hạ thấp tinh bột vào ngày nghỉ ngơi, tăng cường chất béo tốt và duy trì đạm cao để kích hoạt cơ chế đốt mỡ tự nhiên.',
  },
});

/**
 * Tính toán Macros chi tiết cho 1 ngày theo Carb Cycling.
 * @param {object} params
 * @param {number} params.baselineKcal - Mức calo cơ bản (TDEE hoặc target)
 * @param {string} params.workoutType - 'heavy' | 'light' | 'rest'
 * @param {number} [params.weightKg=70] - Cân nặng người dùng (kg)
 */
export function calculateDailyCarbCyclingMacros({ baselineKcal, workoutType, weightKg = 70 }) {
  const typeKey = (workoutType || '').toLowerCase();
  const config = CARB_CYCLING_CONFIG[typeKey] || CARB_CYCLING_CONFIG[CARB_CYCLING_TYPES.LIGHT];

  const targetKcal = Math.round(baselineKcal * config.kcalMultiplier);
  const carbsGrams = Math.round((targetKcal * config.carbPct) / 4);
  const proteinGrams = Math.round((targetKcal * config.proteinPct) / 4);
  const fatGrams = Math.round((targetKcal * config.fatPct) / 9);

  return {
    workoutType: typeKey,
    workoutTypeName: config.name,
    carbLevel: config.carbLevel,
    carbLevelName: config.carbLevelName,
    carbBadge: config.carbBadge,
    description: config.description,
    kcal: targetKcal,
    proteinG: proteinGrams,
    carbsG: carbsGrams,
    fatG: fatGrams,
    carbsPerKg: roundTo(carbsGrams / (weightKg || 70), 1),
    proteinPerKg: roundTo(proteinGrams / (weightKg || 70), 1),
    macroPercentages: {
      carbs: Math.round(config.carbPct * 100),
      protein: Math.round(config.proteinPct * 100),
      fat: Math.round(config.fatPct * 100),
    },
  };
}

/**
 * Các mẫu chu kỳ tập luyện tuần mặc định (Weekly Carb Cycling Presets)
 */
export const DEFAULT_WEEKLY_PRESETS = [
  {
    id: 'standard_4day',
    name: 'Lịch 4 Buổi (Chuẩn Gymer)',
    description: 'Tập nặng Chân & Lưng (High Carb), 2 buổi nhẹ (Moderate Carb) và 3 ngày nghỉ (Low Carb).',
    schedule: [
      { dayIndex: 0, dayName: 'Thứ 2', workoutType: 'heavy', focus: 'Chân & Đùi (Tập nặng)' },
      { dayIndex: 1, dayName: 'Thứ 3', workoutType: 'light', focus: 'Ngực & Tay sau (Tập vừa)' },
      { dayIndex: 2, dayName: 'Thứ 4', workoutType: 'rest', focus: 'Nghỉ ngơi & Phục hồi' },
      { dayIndex: 3, dayName: 'Thứ 5', workoutType: 'heavy', focus: 'Lưng & Xô (Tập nặng)' },
      { dayIndex: 4, dayName: 'Thứ 6', workoutType: 'light', focus: 'Vai & Bụng (Tập vừa)' },
      { dayIndex: 5, dayName: 'Thứ 7', workoutType: 'rest', focus: 'Nghỉ ngơi & Giãn cơ' },
      { dayIndex: 6, dayName: 'Chủ Nhật', workoutType: 'rest', focus: 'Nghỉ ngơi chuẩn bị tuần mới' },
    ],
  },
  {
    id: 'push_pull_legs',
    name: 'Push - Pull - Legs (5-6 Buổi)',
    description: 'Chu kỳ Chân & Kéo lưng nặng x2 nạp Carb cao, xen kẽ ngày Đẩy và Nghỉ ngơi.',
    schedule: [
      { dayIndex: 0, dayName: 'Thứ 2', workoutType: 'heavy', focus: 'Legs: Chân & Mông (Tập nặng)' },
      { dayIndex: 1, dayName: 'Thứ 3', workoutType: 'heavy', focus: 'Pull: Lưng & Tay trước (Tập nặng)' },
      { dayIndex: 2, dayName: 'Thứ 4', workoutType: 'light', focus: 'Push: Ngực & Vai (Tập vừa)' },
      { dayIndex: 3, dayName: 'Thứ 5', workoutType: 'rest', focus: 'Nghỉ ngơi & Phục hồi' },
      { dayIndex: 4, dayName: 'Thứ 6', workoutType: 'heavy', focus: 'Legs & Deadlift (Tập nặng)' },
      { dayIndex: 5, dayName: 'Thứ 7', workoutType: 'light', focus: 'Cardio & Thân trên (Tập nhẹ)' },
      { dayIndex: 6, dayName: 'Chủ Nhật', workoutType: 'rest', focus: 'Nghỉ ngơi' },
    ],
  },
  {
    id: 'upper_lower',
    name: 'Upper - Lower (Thân Trên / Thân Dưới)',
    description: 'Chia đôi thân trên & dưới, tập nặng Chân/Lưng nạp Carb cao, ngày thân trên vừa phải.',
    schedule: [
      { dayIndex: 0, dayName: 'Thứ 2', workoutType: 'heavy', focus: 'Lower: Chân & Đùi (Tập nặng)' },
      { dayIndex: 1, dayName: 'Thứ 3', workoutType: 'light', focus: 'Upper: Ngực & Tay (Tập vừa)' },
      { dayIndex: 2, dayName: 'Thứ 4', workoutKey: 'rest', workoutType: 'rest', focus: 'Nghỉ ngơi' },
      { dayIndex: 3, dayName: 'Thứ 5', workoutType: 'heavy', focus: 'Lower: Lưng & Deadlift (Tập nặng)' },
      { dayIndex: 4, dayName: 'Thứ 6', workoutType: 'light', focus: 'Upper: Vai & Lưng trên (Tập vừa)' },
      { dayIndex: 5, dayName: 'Thứ 7', workoutType: 'rest', focus: 'Nghỉ ngơi & Cardio nhẹ' },
      { dayIndex: 6, dayName: 'Chủ Nhật', workoutType: 'rest', focus: 'Nghỉ ngơi' },
    ],
  },
];

/**
 * Tính toán toàn bộ kế hoạch tuần Carb Cycling cho người dùng.
 * @param {object} params
 * @param {number} params.baselineKcal - TDEE hoặc calo mục tiêu (vd: 2200)
 * @param {Array} [params.schedule] - Danh sách 7 ngày tập luyện
 * @param {number} [params.weightKg=70] - Cân nặng (kg)
 */
export function calculateWeeklyCarbCyclingPlan({ baselineKcal = 2200, schedule = null, weightKg = 70 }) {
  const chosenSchedule = Array.isArray(schedule) && schedule.length === 7
    ? schedule
    : DEFAULT_WEEKLY_PRESETS[0].schedule;

  let totalWeekKcal = 0;
  let totalWeekCarbs = 0;
  let totalWeekProtein = 0;
  let totalWeekFat = 0;

  let heavyDaysCount = 0;
  let lightDaysCount = 0;
  let restDaysCount = 0;

  const daysPlan = chosenSchedule.map((day, idx) => {
    const wType = (day.workoutType || 'light').toLowerCase();
    if (wType === 'heavy') heavyDaysCount++;
    else if (wType === 'rest') restDaysCount++;
    else lightDaysCount++;

    const macros = calculateDailyCarbCyclingMacros({
      baselineKcal,
      workoutType: wType,
      weightKg,
    });

    totalWeekKcal += macros.kcal;
    totalWeekCarbs += macros.carbsG;
    totalWeekProtein += macros.proteinG;
    totalWeekFat += macros.fatG;

    return {
      dayIndex: day.dayIndex ?? idx,
      dayName: day.dayName || `Ngày ${idx + 1}`,
      focus: day.focus || macros.workoutTypeName,
      ...macros,
    };
  });

  const avgDailyKcal = Math.round(totalWeekKcal / 7);
  const avgDailyCarbs = Math.round(totalWeekCarbs / 7);
  const avgDailyProtein = Math.round(totalWeekProtein / 7);
  const avgDailyFat = Math.round(totalWeekFat / 7);

  return {
    baselineKcal,
    weightKg,
    summary: {
      totalWeekKcal,
      avgDailyKcal,
      avgDailyCarbs,
      avgDailyProtein,
      avgDailyFat,
      heavyDaysCount,
      lightDaysCount,
      restDaysCount,
      description: `Chu kỳ tuần gồm ${heavyDaysCount} ngày tập nặng (High Carb), ${lightDaysCount} ngày tập vừa (Moderate Carb), và ${restDaysCount} ngày nghỉ ngơi (Low Carb).`,
    },
    days: daysPlan,
  };
}
