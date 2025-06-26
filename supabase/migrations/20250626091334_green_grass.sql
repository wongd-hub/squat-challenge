/*
  # Create login codes table for email authentication

  1. New Tables
    - `login_codes`
      - `id` (uuid, primary key)
      - `email` (text, not null)
      - `code` (text, not null)
      - `expires_at` (timestamptz, not null)
      - `used` (boolean, default false)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `login_codes` table
    - Add policy for service role to manage codes
    - Add policy for users to verify their own codes
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

-- Enable RLS
ALTER TABLE login_codes ENABLE ROW LEVEL SECURITY;

-- Policy for service role to manage codes (insert, update, delete)
CREATE POLICY "Service role can manage login codes"
  ON login_codes
  FOR ALL
  TO service_role
  USING (true);

-- Policy for authenticated users to read their own codes
CREATE POLICY "Users can read their own login codes"
  ON login_codes
  FOR SELECT
  TO authenticated
  USING (email = auth.jwt() ->> 'email');

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_login_codes_email_code ON login_codes(email, code);
CREATE INDEX IF NOT EXISTS idx_login_codes_expires_at ON login_codes(expires_at);