/*
  # Update Total Leaderboard Function to Filter by Challenge Dates
  
  This migration updates the get_total_leaderboard function to accept optional
  start_date and end_date parameters, allowing it to filter results to only
  include progress within the challenge period.
*/

-- Update the get_total_leaderboard function to accept date parameters
CREATE OR REPLACE FUNCTION get_total_leaderboard(
  start_date date DEFAULT NULL,
  end_date date DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  email text,
  total_squats bigint,
  days_active bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.display_name,
    p.email,
    COALESCE(SUM(up.squats_completed), 0) as total_squats,
    COUNT(up.date) as days_active
  FROM profiles p
  LEFT JOIN user_progress up ON p.id = up.user_id
    AND (start_date IS NULL OR up.date >= start_date)
    AND (end_date IS NULL OR up.date <= end_date)
  GROUP BY p.id, p.display_name, p.email
  ORDER BY total_squats DESC, days_active DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 