-- Debug query to check knockout match naming for special tournament
-- Replace '11' with your tournament ID

SELECT 
  t.id as tournament_id,
  t.name as tournament_name,
  t.tournament_type,
  f.id as fixture_id,
  hm.name as home_manager,
  hc.name as home_club_name,
  tth.custom_team_name as home_custom_name,
  tth.use_existing_club as home_use_existing,
  am.name as away_manager,
  ac.name as away_club_name,
  tta.custom_team_name as away_custom_name,
  tta.use_existing_club as away_use_existing,
  kr.round_name
FROM knockout_rounds kr
JOIN knockout_pairings kp ON kp.knockout_round_id = kr.id
JOIN fixtures f ON (f.id = kp.leg1_match_id OR f.id = kp.leg2_match_id)
JOIN tournaments t ON kr.tournament_id = t.id
LEFT JOIN managers hm ON f.home_club_id = hm.id
LEFT JOIN clubs hc ON hm.id = hc.id
LEFT JOIN managers am ON f.away_club_id = am.id
LEFT JOIN clubs ac ON am.id = ac.id
LEFT JOIN tournament_teams tth ON tth.tournament_name = t.name AND tth.club_id = f.home_club_id
LEFT JOIN tournament_teams tta ON tta.tournament_name = t.name AND tta.club_id = f.away_club_id
WHERE kr.tournament_id = 11
ORDER BY kp.pairing_order;
