ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_foodblog_private boolean DEFAULT false;
