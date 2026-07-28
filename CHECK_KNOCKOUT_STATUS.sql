-- Check knockout rounds and their status for tournament 11

SELECT 
  kr.id,
  kr.round_name,
  kr.round_order,
  kr.status,
  COUNT(kp.id) as num_pairings,
  COUNT(kp.leg1_match_id) as num_leg1_fixtures,
  COUNT(kp.leg2_match_id) as num_leg2_fixtures,
  COUNT(CASE WHEN kp.team1_id IS NOT NULL THEN 1 END) as team1_set,
  COUNT(CASE WHEN kp.team2_id IS NOT NULL THEN 1 END) as team2_set
FROM knockout_rounds kr
LEFT JOIN knockout_pairings kp ON kp.knockout_round_id = kr.id
WHERE kr.tournament_id = 11
GROUP BY kr.id, kr.round_name, kr.round_order, kr.status
ORDER BY kr.round_order;
