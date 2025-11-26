-- Add profile_picture column to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- Add comment
COMMENT ON COLUMN user_profiles.profile_picture IS 'URL to the user profile picture stored in Supabase Storage';

