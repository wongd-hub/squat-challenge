/*
  # Fix Profile Insertion RLS Policy

  1. Changes
    - Update "Users can insert own profile" policy to allow public access
    - This fixes the issue where newly signed-up users can't create their profile
    - Security is still maintained through the WITH CHECK clause

  2. Security
    - The WITH CHECK (auth.uid() = id) ensures only the user can create their own profile
    - Even with TO public, users can only insert records where their auth.uid() matches the id
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create new policy that allows public access for insertion
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = id);