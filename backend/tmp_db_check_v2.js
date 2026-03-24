const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/aibake_db'
});

async function run() {
  try {
    console.log('--- Checking for NOT NULL constraints in recipe_audio_notes ---');
    const constraints = await pool.query(`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'recipe_audio_notes'
    `);
    constraints.rows.forEach(col => {
      console.log(`- ${col.column_name}: Nullable? ${col.is_nullable}`);
    });

    console.log('\n--- Checking for all ingredients (Top 50) ---');
    const allIng = await pool.query('SELECT name, user_id FROM ingredient_master ORDER BY name LIMIT 50');
    allIng.rows.forEach(row => {
      console.log(`- ${row.name} (User: ${row.user_id || 'SYSTEM'})`);
    });

    console.log('\n--- Fuzzy search for duplicates (normalized names) ---');
    const fuzzy = await pool.query(`
      SELECT LOWER(TRIM(name)) as normalized_name, COUNT(*) 
      FROM ingredient_master 
      GROUP BY LOWER(TRIM(name)) 
      HAVING COUNT(*) > 1
    `);
    console.log(`Found ${fuzzy.rowCount} normalized name overlaps.`);
    fuzzy.rows.forEach(row => {
      console.log(`- ${row.normalized_name}: ${row.count} occurrences`);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
