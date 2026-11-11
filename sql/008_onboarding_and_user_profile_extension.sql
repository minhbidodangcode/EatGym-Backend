-- 008_onboarding_and_user_profile_extension.sql
-- Extend user_profiles with comprehensive onboarding attributes (4-step onboarding).

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS target_weight_kg numeric(5,2),
  ADD COLUMN IF NOT EXISTS medical_history text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS favorite_foods text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_vegan boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS diet_lifestyle text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cooking_frequency varchar(50) DEFAULT 'sometimes',
  ADD COLUMN IF NOT EXISTS grocery_frequency varchar(50) DEFAULT 'weekly',
  ADD COLUMN IF NOT EXISTS meal_prep_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS creator_name varchar(120),
  ADD COLUMN IF NOT EXISTS creator_handle varchar(60),
  ADD COLUMN IF NOT EXISTS creator_bio text,
  ADD COLUMN IF NOT EXISTS cooking_specialties text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS kitchen_sync_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_user_profiles_creator_handle ON user_profiles (creator_handle) WHERE creator_handle IS NOT NULL;
