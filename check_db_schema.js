const { Client } = require('pg');

async function checkSchema() {
  const client = new Client({
    connectionString: 'postgresql://postgres:wBkO4z5qFXb3aehR@db.fxedksenksggdacsjqxq.supabase.co:5432/postgres'
  });
  
  try {
    await client.connect();
    
    // Get tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log('Tables:', tables);
    
    // Sample a few important ones
    for (const table of tables) {
      console.log(`\n--- Schema for ${table} ---`);
      const cols = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1
      `, [table]);
      console.log(cols.rows.map(c => `${c.column_name}: ${c.data_type}`).join(', '));
      
      const count = await client.query(`SELECT COUNT(*) FROM "${table}"`);
      console.log(`Row count: ${count.rows[0].count}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkSchema();
