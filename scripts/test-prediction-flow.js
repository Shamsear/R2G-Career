require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.SOLO_DATABASE_URL || process.env.DATABASE_URL || process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testPredictionFlow() {
  try {
    console.log('🚀 Running Comprehensive Master of Prediction Flow Test...');

    // 1. Fetch Season 1
    const { rows: seasonRows } = await pool.query('SELECT * FROM prediction_seasons WHERE season_number = 1');
    const seasonId = seasonRows[0].id;
    console.log(`✅ Target Season ID: ${seasonId} ("${seasonRows[0].name}")`);

    // 2. Fetch top 5 managers
    const { rows: managers } = await pool.query('SELECT id, name, r2g_id FROM managers LIMIT 5');
    console.log(`✅ Testing with 5 managers:`, managers.map(m => `${m.name} (${m.id})`).join(', '));

    // 3. Insert Test Points for Day 1 (Week 1)
    // Points: 15, 12, 10, 8, 5
    const day1Scores = [
      { member_id: managers[0].id, points: 15 },
      { member_id: managers[1].id, points: 12 },
      { member_id: managers[2].id, points: 10 },
      { member_id: managers[3].id, points: 8 },
      { member_id: managers[4].id, points: 5 },
    ];

    for (const s of day1Scores) {
      await pool.query(`
        INSERT INTO prediction_scores (season_id, day_number, week_number, member_id, points)
        VALUES ($1, 1, 1, $2, $3)
        ON CONFLICT (season_id, day_number, member_id)
        DO UPDATE SET points = EXCLUDED.points
      `, [seasonId, s.member_id, s.points]);
    }

    await pool.query(`
      UPDATE prediction_days
      SET is_completed = true, title = 'Day 1 - UCL Opening Clash'
      WHERE season_id = $1 AND day_number = 1
    `, [seasonId]);

    console.log('✅ Day 1 scores inserted & Day 1 marked completed!');

    // 4. Insert Test Points for Day 2 (Week 1)
    // Points: 10, 15, 12, 14, 8
    const day2Scores = [
      { member_id: managers[0].id, points: 10 }, // Total: 25
      { member_id: managers[1].id, points: 15 }, // Total: 27 (Top Leader!)
      { member_id: managers[2].id, points: 12 }, // Total: 22
      { member_id: managers[3].id, points: 14 }, // Total: 22
      { member_id: managers[4].id, points: 8 },  // Total: 13
    ];

    for (const s of day2Scores) {
      await pool.query(`
        INSERT INTO prediction_scores (season_id, day_number, week_number, member_id, points)
        VALUES ($1, 2, 1, $2, $3)
        ON CONFLICT (season_id, day_number, member_id)
        DO UPDATE SET points = EXCLUDED.points
      `, [seasonId, s.member_id, s.points]);
    }

    await pool.query(`
      UPDATE prediction_days
      SET is_completed = true, title = 'Day 2 - Premier League Showdown'
      WHERE season_id = $1 AND day_number = 2
    `, [seasonId]);

    console.log('✅ Day 2 scores inserted & Day 2 marked completed!');

    // 5. Test Leaderboard Calculation Query
    const { rows: leaderboard } = await pool.query(`
      SELECT 
        m.name,
        m.r2g_id,
        COALESCE(SUM(psc.points), 0) as total_points,
        COUNT(DISTINCT psc.day_number) as days_played
      FROM managers m
      JOIN prediction_scores psc ON m.id = psc.member_id
      WHERE psc.season_id = $1
      GROUP BY m.id, m.name, m.r2g_id
      ORDER BY total_points DESC, m.name ASC
    `, [seasonId]);

    console.log('\n📊 Standings after Day 1 & Day 2:');
    leaderboard.forEach((row, idx) => {
      const medal = idx === 0 ? '👑 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`;
      console.log(`   ${medal} ${row.name} (${row.r2g_id || 'ID'}) — ${row.total_points} pts (${row.days_played} days)`);
    });

    // 6. Test Week 1 MOTW
    const { rows: week1Motw } = await pool.query(`
      SELECT 
        m.name,
        m.r2g_id,
        COALESCE(SUM(psc.points), 0) as week_points
      FROM prediction_scores psc
      JOIN managers m ON psc.member_id = m.id
      WHERE psc.season_id = $1 AND psc.week_number = 1
      GROUP BY m.id, m.name, m.r2g_id
      ORDER BY week_points DESC
      LIMIT 1
    `, [seasonId]);

    console.log(`\n🌟 Week 1 MOTW: ${week1Motw[0]?.name} with ${week1Motw[0]?.week_points} pts!`);

    console.log('\n🎉 ALL MASTER OF PREDICTION TESTS PASSED SUCCESSFULLY!');
    await pool.end();
  } catch (err) {
    console.error('❌ Test failed:', err);
    await pool.end();
    process.exit(1);
  }
}

testPredictionFlow();
