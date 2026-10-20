-- Nutrition tracking, body-stat history, inventory and calorie compensation (task image 2).
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS allergies TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dietary_preferences TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_macros JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS user_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 100,
  unit VARCHAR(32) NOT NULL DEFAULT 'g',
  calories NUMERIC(8,2) NOT NULL DEFAULT 0,
  protein NUMERIC(8,2) NOT NULL DEFAULT 0,
  carbs NUMERIC(8,2) NOT NULL DEFAULT 0,
  fat NUMERIC(8,2) NOT NULL DEFAULT 0,
  category VARCHAR(60) NOT NULL DEFAULT 'other',
  icon VARCHAR(16),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meal_prep_batch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES meal_prep_batches(id) ON DELETE CASCADE,
  yield_factor_id UUID NOT NULL REFERENCES ingredient_yield_factors(id) ON DELETE RESTRICT,
  input_state VARCHAR(16) NOT NULL,
  input_weight_g NUMERIC(8,2) NOT NULL,
  raw_weight_g NUMERIC(8,2) NOT NULL,
  cooked_weight_g NUMERIC(8,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nutrition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type VARCHAR(24) NOT NULL DEFAULT 'breakfast',
  food_name VARCHAR(200) NOT NULL,
  serving_size NUMERIC(8,2) NOT NULL DEFAULT 1,
  serving_unit VARCHAR(32) NOT NULL DEFAULT 'portion',
  calories NUMERIC(8,2) NOT NULL DEFAULT 0,
  protein NUMERIC(8,2) NOT NULL DEFAULT 0,
  carbs NUMERIC(8,2) NOT NULL DEFAULT 0,
  fat NUMERIC(8,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT nutrition_logs_meal_type_valid CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  CONSTRAINT nutrition_logs_nonnegative CHECK (serving_size > 0 AND calories >= 0 AND protein >= 0 AND carbs >= 0 AND fat >= 0)
);
CREATE INDEX IF NOT EXISTS nutrition_logs_user_date_idx ON nutrition_logs (user_id, log_date, created_at);

CREATE TABLE IF NOT EXISTS body_stats_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  measured_on DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg NUMERIC(5,2) NOT NULL,
  height_cm NUMERIC(5,2),
  body_fat_percent NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT body_stats_weight_valid CHECK (weight_kg BETWEEN 10 AND 500),
  CONSTRAINT body_stats_height_valid CHECK (height_cm IS NULL OR height_cm BETWEEN 50 AND 300),
  CONSTRAINT body_stats_fat_valid CHECK (body_fat_percent IS NULL OR body_fat_percent BETWEEN 0 AND 100)
);
CREATE INDEX IF NOT EXISTS body_stats_user_date_idx ON body_stats_history (user_id, measured_on DESC);

CREATE TABLE IF NOT EXISTS meal_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_date DATE NOT NULL,
  meal_slot VARCHAR(24) NOT NULL,
  planned_kcal NUMERIC(8,2) NOT NULL,
  adjustment_kcal NUMERIC(8,2) NOT NULL DEFAULT 0,
  effective_kcal NUMERIC(8,2) GENERATED ALWAYS AS (planned_kcal + adjustment_kcal) STORED,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, target_date, meal_slot),
  CONSTRAINT meal_targets_nonnegative CHECK (planned_kcal >= 0 AND planned_kcal + adjustment_kcal >= 0)
);

CREATE TABLE IF NOT EXISTS calorie_deviations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  occurred_on DATE NOT NULL,
  target_kcal NUMERIC(8,2) NOT NULL,
  actual_kcal NUMERIC(8,2) NOT NULL,
  delta_kcal NUMERIC(8,2) GENERATED ALWAYS AS (actual_kcal - target_kcal) STORED,
  note VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT calorie_deviations_nonnegative CHECK (target_kcal >= 0 AND actual_kcal >= 0)
);

CREATE TABLE IF NOT EXISTS calorie_compensations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deviation_id UUID NOT NULL UNIQUE REFERENCES calorie_deviations(id) ON DELETE CASCADE,
  horizon_days SMALLINT NOT NULL,
  requested_kcal NUMERIC(8,2) NOT NULL,
  allocated_kcal NUMERIC(8,2) NOT NULL,
  unallocated_kcal NUMERIC(8,2) NOT NULL,
  min_kcal_per_meal NUMERIC(8,2) NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS calorie_compensation_allocations (
  compensation_id UUID NOT NULL REFERENCES calorie_compensations(id) ON DELETE CASCADE,
  meal_target_id UUID NOT NULL REFERENCES meal_targets(id) ON DELETE CASCADE,
  compensation_kcal NUMERIC(8,2) NOT NULL CHECK (compensation_kcal > 0),
  PRIMARY KEY (compensation_id, meal_target_id)
);
