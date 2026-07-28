-- Check current state of knockout rounds for tournament 11

-- 1. Check all knockout rounds
SELECT 
  kr.id as round_id,
  kr.round_name,
  kr.round_order,
  kr.legs,
  kr.status,
  COUNT(kp.id) as pairing_count
FROM knockout_rounds kr
LEFT JOIN knockout_pairings kp ON kp.knockout_round_id = kr.id
WHERE kr.tournament_id = 11
GROUP BY kr.id, kr.round_name, kr.round_order, kr.legs, kr.status
ORDER BY kr.round_order;

-- 2. Check all pairings with their teams and fixtures
SELECT 
  kr.round_name,
  kp.id as pairing_id,
  kp.pairing_order,
  kp.team1_id,
  kp.team2_id,
  kp.team1_placeholder,
  kp.team2_placeholder,
  kp.leg1_match_id,
  kp.leg2_match_id,
  kp.winner_id,
  CASE 
    WHEN kp.team1_id IS NOT NULL THEN (
      SELECT COALESCE(tt.custom_team_name, m.name, c.name)
      FROM managers m
      LEFT JOIN clubs c ON m.id = c.id
      LEFT JOIN tournament_teams tt ON tt.club_id = m.id AND tt.tournament_name = t.name
      WHERE m.id = kp.team1_id
    )
    ELSE kp.team1_placeholder
  END as team1_display,
  CASE 
    WHEN kp.team2_id IS NOT NULL THEN (
      SELECT COALESCE(tt.custom_team_name, m.name, c.name)
      FROM managers m
      LEFT JOIN clubs c ON m.id = c.id
      LEFT JOIN tournament_teams tt ON tt.club_id = m.id AND tt.tournament_name = t.name
      WHERE m.id = kp.team2_id
    )
    ELSE kp.team2_placeholder
  END as team2_display
FROM knockout_rounds kr
JOIN knockout_pairings kp ON kp.knockout_round_id = kr.id
JOIN tournaments t ON kr.tournament_id = t.id
WHERE kr.tournament_id = 11
ORDER BY kr.round_order, kp.pairing_order;

-- 3. Check if fixtures exist for these pairings
SELECT 
  kr.round_name,
  kp.pairing_order,
  f1.id as leg1_fixture_id,
  f1.match_status as leg1_status,
  f2.id as leg2_fixture_id,
  f2.match_status as leg2_status
FROM knockout_rounds kr
JOIN knockout_pairings kp ON kp.knockout_round_id = kr.id
LEFT JOIN fixtures f1 ON f1.id = kp.leg1_match_id
LEFT JOIN fixtures f2 ON f2.id = kp.leg2_match_id
WHERE kr.tournament_id = 11
ORDER BY kr.round_order, kp.pairing_order;

-- 4. Check total fixture count for tournament 11
SELECT 
  COUNT(*) as total_fixtures,
  SUM(CASE WHEN round_number = 100 THEN 1 ELSE 0 END) as knockout_fixtures,
  SUM(CASE WHEN round_number != 100 THEN 1 ELSE 0 END) as group_fixtures
FROM fixtures
WHERE tournament_id = 11;
