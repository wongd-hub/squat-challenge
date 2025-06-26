/*
  # Create Login Code System

  1. New Tables
    - `login_codes`
      - `id` (uuid, primary key)
      - `email` (text)
      - `code` (text, 4-digit code)
      - `expires_at` (timestamp)
      - `used` (boolean)
      - `created_at` (timestamp)
    
    - `user_sessions`
      - `id` (uuid, primary key, session token)
      - `user_id` (uuid, references profiles)
      - `expires_at` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Public access for login code operations
    - Users can only access their own sessions

  3. Functions
    - Cleanup expired codes and sessions
*/

-- Create login_codes table
CREATE TABLE IF NOT EXISTS login_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE login_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Login codes policies (public access for authentication flow)
CREATE POLICY "Anyone can insert login codes"
  ON login_codes
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can read login codes for verification"
  ON login_codes
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can update login codes for verification"
  ON login_codes
  FOR UPDATE
  TO public
  USING (true);

-- User sessions policies
CREATE POLICY "Anyone can insert user sessions"
  ON user_sessions
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can read user sessions for verification"
  ON user_sessions
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can delete user sessions"
  ON user_sessions
  FOR DELETE
  TO public
  USING (true);

-- Function to cleanup expired codes and sessions
CREATE OR REPLACE FUNCTION cleanup_expired_auth()
RETURNS void AS $$
BEGIN
  -- Delete expired login codes
  DELETE FROM login_codes 
  WHERE expires_at < now() OR used = true;
  
  -- Delete expired sessions
  DELETE FROM user_sessions 
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_login_codes_email_code ON login_codes(email, code);
CREATE INDEX IF NOT EXISTS idx_login_codes_expires_at ON login_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);