-- 009_onboarding_shopping_apps.sql
-- Add online shopping fallback flag and linked shopping apps for ingredient ordering.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS online_shopping_when_needed boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS linked_shopping_apps text[] DEFAULT '{}';
