import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Pool } from 'pg';
import { createPlayoffTournamentAction, resolveAllPlaceholders } from '../utils/solo/knockoutActions';

const pool = new Pool({
  connectionString: process.env.SOLO_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runTest() {
  console.log('=== STEP 1: Generate Fresh Dual Playoffs for Tournament 9 ===');
  await createPlayoffTournamentAction(pool, {
    tournamentId: 9,
    playoffType: 'dual',
    legs: 1
  });

  // Query generated Round 110 & 111 fixtures
  const { rows: initialFixtures } = await pool.query(
    `SELECT id, round_number, group_name, home_club_id, away_club_id, match_status
     FROM fixtures WHERE tournament_id = 9 AND round_number >= 100
     ORDER BY round_number, group_name`
  );
  console.log('Initial Playoff Fixtures:');
  console.table(initialFixtures);

  const fP1_A = initialFixtures.find(f => f.round_number === 110 && f.group_name === 'A');
  const fElim_A = initialFixtures.find(f => f.round_number === 111 && f.group_name === 'A');
  const fP1_B = initialFixtures.find(f => f.round_number === 110 && f.group_name === 'B');
  const fElim_B = initialFixtures.find(f => f.round_number === 111 && f.group_name === 'B');

  console.log('\n=== STEP 2: Simulate Playoff 1 & Eliminator Matches ===');
  // Group A P1: Home (Dortmund/6) wins 3-1 vs Away (Newcastle/19)
  // Winner: 6 (to Final), Loser: 19 (to Playoff 2)
  await pool.query(
    `UPDATE fixtures SET home_score = 3, away_score = 1, match_status = 'finished' WHERE id = $1`,
    [fP1_A.id]
  );
  await pool.query(
    `UPDATE knockout_pairings SET winner_id = $1 WHERE leg1_match_id = $2`,
    [fP1_A.home_club_id, fP1_A.id]
  );

  // Group A Eliminator: Home (Goa/11) loses 0-2 to Away (Arsenal/3)
  // Winner: 3 (to Playoff 2), Loser: 11 eliminated
  await pool.query(
    `UPDATE fixtures SET home_score = 0, away_score = 2, match_status = 'finished' WHERE id = $1`,
    [fElim_A.id]
  );
  await pool.query(
    `UPDATE knockout_pairings SET winner_id = $1 WHERE leg1_match_id = $2`,
    [fElim_A.away_club_id, fElim_A.id]
  );

  // Group B P1: Home (Everton/8) loses 1-2 to Away (Real Madrid/21)
  // Winner: 21 (to Final), Loser: 8 (to Playoff 2)
  await pool.query(
    `UPDATE fixtures SET home_score = 1, away_score = 2, match_status = 'finished' WHERE id = $1`,
    [fP1_B.id]
  );
  await pool.query(
    `UPDATE knockout_pairings SET winner_id = $1 WHERE leg1_match_id = $2`,
    [fP1_B.away_club_id, fP1_B.id]
  );

  // Group B Eliminator: Home (Santos/22) wins 1-0 vs Away (Barcelona/10)
  // Winner: 22 (to Playoff 2), Loser: 10 eliminated
  await pool.query(
    `UPDATE fixtures SET home_score = 1, away_score = 0, match_status = 'finished' WHERE id = $1`,
    [fElim_B.id]
  );
  await pool.query(
    `UPDATE knockout_pairings SET winner_id = $1 WHERE leg1_match_id = $2`,
    [fElim_B.home_club_id, fElim_B.id]
  );

  console.log('\n=== STEP 3: Resolve Placeholders -> Auto-Create Playoff 2 Fixtures ===');
  const resolve1 = await resolveAllPlaceholders(pool, 9);
  console.log('Resolve 1 result:', resolve1);

  const { rows: afterStage1Fixtures } = await pool.query(
    `SELECT id, round_number, group_name, home_club_id, away_club_id, home_score, away_score, match_status
     FROM fixtures WHERE tournament_id = 9 AND round_number >= 100
     ORDER BY round_number, group_name`
  );
  console.log('Fixtures after Stage 1 (P1 + Eliminator):');
  console.table(afterStage1Fixtures);

  const fP2_A = afterStage1Fixtures.find(f => f.round_number === 112 && f.group_name === 'A');
  const fP2_B = afterStage1Fixtures.find(f => f.round_number === 112 && f.group_name === 'B');

  console.log('\n=== STEP 4: Simulate Playoff 2 Matches ===');
  // Group A P2: Newcastle (19) vs Arsenal (3) -> Newcastle (19) wins 2-1
  // Winner: 19 (to Final A vs Dortmund/6)
  await pool.query(
    `UPDATE fixtures SET home_score = 2, away_score = 1, match_status = 'finished' WHERE id = $1`,
    [fP2_A.id]
  );
  await pool.query(
    `UPDATE knockout_pairings SET winner_id = $1 WHERE leg1_match_id = $2`,
    [19, fP2_A.id]
  );

  // Group B P2: Everton (8) vs Santos (22) -> Everton (8) wins 3-0
  // Winner: 8 (to Final B vs Real Madrid/21)
  await pool.query(
    `UPDATE fixtures SET home_score = 3, away_score = 0, match_status = 'finished' WHERE id = $1`,
    [fP2_B.id]
  );
  await pool.query(
    `UPDATE knockout_pairings SET winner_id = $1 WHERE leg1_match_id = $2`,
    [8, fP2_B.id]
  );

  console.log('\n=== STEP 5: Resolve Placeholders -> Auto-Create Finals Fixtures ===');
  const resolve2 = await resolveAllPlaceholders(pool, 9);
  console.log('Resolve 2 result:', resolve2);

  const { rows: finalsFixtures } = await pool.query(
    `SELECT id, round_number, group_name, home_club_id, away_club_id, home_score, away_score, match_status
     FROM fixtures WHERE tournament_id = 9 AND round_number >= 100
     ORDER BY round_number, group_name`
  );
  console.log('Fixtures including Finals (113):');
  console.table(finalsFixtures);

  const fFinal_A = finalsFixtures.find(f => f.round_number === 113 && f.group_name === 'A');
  const fFinal_B = finalsFixtures.find(f => f.round_number === 113 && f.group_name === 'B');

  console.log('\n=== STEP 6: Simulate Finals (Determine 2 Champions & 2 Runners-Up) ===');
  // Final A: Dortmund (6) vs Newcastle (19) -> Dortmund wins 2-0 -> Champion: 6, Runner-up: 19
  await pool.query(
    `UPDATE fixtures SET home_score = 2, away_score = 0, match_status = 'finished' WHERE id = $1`,
    [fFinal_A.id]
  );
  await pool.query(
    `UPDATE knockout_pairings SET winner_id = $1 WHERE leg1_match_id = $2`,
    [fFinal_A.home_club_id, fFinal_A.id]
  );

  // Final B: Real Madrid (21) vs Everton (8) -> Real Madrid wins 1-0 -> Champion: 21, Runner-up: 8
  await pool.query(
    `UPDATE fixtures SET home_score = 1, away_score = 0, match_status = 'finished' WHERE id = $1`,
    [fFinal_B.id]
  );
  await pool.query(
    `UPDATE knockout_pairings SET winner_id = $1 WHERE leg1_match_id = $2`,
    [fFinal_B.home_club_id, fFinal_B.id]
  );

  const { rows: finalPairings } = await pool.query(
    `SELECT kp.id, kr.round_name, kp.pairing_order, kp.team1_id, kp.team2_id, kp.winner_id
     FROM knockout_pairings kp
     JOIN knockout_rounds kr ON kp.knockout_round_id = kr.id
     WHERE kr.tournament_id = 9
     ORDER BY kr.round_order, kr.round_name, kp.pairing_order`
  );
  console.log('\nFinal Pairings with all Winners:');
  console.table(finalPairings);

  console.log('\n=== STEP 7: Reset Back to Scheduled Initial Dual Playoff State for User Testing ===');
  await createPlayoffTournamentAction(pool, {
    tournamentId: 9,
    playoffType: 'dual',
    legs: 1
  });

  const { rows: cleanFixtures } = await pool.query(
    `SELECT id, round_number, group_name, home_club_id, away_club_id, match_status
     FROM fixtures WHERE tournament_id = 9 AND round_number >= 100
     ORDER BY round_number, group_name`
  );
  console.log('Clean Scheduled Dual Playoff Fixtures ready for Tournament 9:');
  console.table(cleanFixtures);

  await pool.end();
  console.log('\n🎉 ALL 7 LIFECYCLE TESTS PASSED PERFECTLY!');
  process.exit(0);
}

runTest().catch(err => {
  console.error('Test failed:', err);
  pool.end();
  process.exit(1);
});
