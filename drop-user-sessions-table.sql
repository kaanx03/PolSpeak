-- Drop user_sessions table and all related objects
-- Run this in Supabase SQL Editor

-- Drop the cleanup function
DROP FUNCTION IF EXISTS cleanup_old_sessions();

-- Drop the table (this will also drop policies and indexes automatically)
DROP TABLE IF EXISTS user_sessions CASCADE;
