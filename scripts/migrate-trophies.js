const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.SOLO_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const legacySeasonsData = [
  {
    id: "season7",
    trophies: Array.from({ length: 12 }, (_, i) => `/assets/images/trophy/s7t${i + 1}.webp`),
    awards: Array.from({ length: 7 }, (_, i) => `/assets/images/trophy/s7a${i + 1}.webp`),
  },
  {
    id: "season6",
    trophies: [
      "/assets/images/trophy/s6t1.webp",
      "/assets/images/trophy/s6t12.webp",
      ...Array.from({ length: 10 }, (_, i) => `/assets/images/trophy/s6t${i + 2}.webp`),
    ],
    awards: Array.from({ length: 7 }, (_, i) => `/assets/images/trophy/s6a${i + 1}.webp`),
  },
  {
    id: "season5",
    trophies: Array.from({ length: 12 }, (_, i) => `/assets/images/trophy/3t${i + 1}.webp`),
    awards: Array.from({ length: 8 }, (_, i) => `/assets/images/trophy/3a${i + 1}.webp`),
  },
  {
    id: "season4",
    trophies: Array.from({ length: 8 }, (_, i) => `/assets/images/trophy/t${i + 1}.webp`),
    awards: Array.from({ length: 7 }, (_, i) => `/assets/images/trophy/ta${i + 1}.webp`),
  },
  {
    id: "season2",
    trophies: [
      "/assets/images/trophy/elitet2.webp",
      "/assets/images/trophy/div1t2.webp",
      "/assets/images/trophy/div2t2.webp",
      "/assets/images/trophy/uclt.webp",
      "/assets/images/trophy/uelt.webp",
      "/assets/images/trophy/ueclt.webp",
      "/assets/images/trophy/trio.webp",
      "/assets/images/trophy/special.webp",
      "/assets/images/trophy/divcup.webp",
      "/assets/images/trophy/tos.webp",
    ],
    awards: [
      "/assets/images/trophy/best.webp",
      "/assets/images/trophy/ballen.webp",
      "/assets/images/trophy/muller.webp",
      "/assets/images/trophy/yashin.webp",
      "/assets/images/trophy/golden.webp",
      "/assets/images/trophy/maldini.webp",
    ],
  },
  {
    id: "season1",
    trophies: [
      "/assets/images/trophy/elitet.webp",
      "/assets/images/trophy/div1t.webp",
      "/assets/images/trophy/div2t.webp",
      "/assets/images/trophy/kingt.webp",
      "/assets/images/trophy/supert.webp",
      "/assets/images/trophy/divg.webp",
      "/assets/images/trophy/eurot.webp",
      "/assets/images/trophy/team.webp",
    ],
    awards: [
      "/assets/images/trophy/a1.webp",
      "/assets/images/trophy/a2.webp",
      "/assets/images/trophy/gerd.webp",
      "/assets/images/trophy/a4.webp",
      "/assets/images/trophy/a5.webp",
      "/assets/images/trophy/a6.webp",
    ],
  },
];

async function run() {
  console.log('🚀 Starting solo trophy cabinet database migration...');
  
  // 1. Create table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS solo_trophy_cabinet (
      id SERIAL PRIMARY KEY,
      season_key VARCHAR(255) NOT NULL,
      category VARCHAR(50) NOT NULL CHECK (category IN ('trophy', 'award')),
      image_url VARCHAR(500) NOT NULL,
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Created or verified table: solo_trophy_cabinet');
  
  // 2. Check if table is empty
  const { rows } = await pool.query('SELECT COUNT(*)::int as count FROM solo_trophy_cabinet');
  const count = rows[0].count;
  
  if (count === 0) {
    console.log('📦 Table is empty. Migrating legacy static data...');
    
    await pool.query('BEGIN');
    try {
      let insertCount = 0;
      for (const season of legacySeasonsData) {
        // Insert trophies
        for (let i = 0; i < season.trophies.length; i++) {
          await pool.query(`
            INSERT INTO solo_trophy_cabinet (season_key, category, image_url, display_order)
            VALUES ($1, 'trophy', $2, $3)
          `, [season.id, season.trophies[i], i]);
          insertCount++;
        }
        
        // Insert awards
        for (let i = 0; i < season.awards.length; i++) {
          await pool.query(`
            INSERT INTO solo_trophy_cabinet (season_key, category, image_url, display_order)
            VALUES ($1, 'award', $2, $3)
          `, [season.id, season.awards[i], i]);
          insertCount++;
        }
      }
      await pool.query('COMMIT');
      console.log(`✅ Successfully migrated ${insertCount} static items!`);
    } catch (e) {
      await pool.query('ROLLBACK');
      console.error('❌ Error migrating data:', e);
      process.exit(1);
    }
  } else {
    console.log(`ℹ️ Table already contains ${count} items. Skipping initial data migration.`);
  }
  
  process.exit(0);
}

run().catch(console.error);
