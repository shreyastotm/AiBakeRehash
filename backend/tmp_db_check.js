const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/aibake_db'
});

async function run() {
  try {
    console.log('--- Checking Ingredient Overlap ---');
    const ingredients = await pool.query('SELECT id, name, user_id FROM ingredient_master WHERE user_id IS NOT NULL');
    console.log(`Found ${ingredients.rowCount} custom ingredients.`);
    ingredients.rows.forEach(row => {
      console.log(`- ${row.name} (ID: ${row.id}, User: ${row.user_id})`);
    });

    console.log('\n--- Checking Table Schemas ---');
    const tables = ['recipe_journal_entries', 'recipe_audio_notes', 'ingredient_master', 'ingredient_aliases'];
    for (const table of tables) {
      const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [table]);
      console.log(`Table: ${table}`);
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
    }

    console.log('\n--- Checking for potential duplicates ---');
    const duplicates = await pool.query(`
      SELECT name, COUNT(*) 
      FROM ingredient_master 
      GROUP BY name 
      HAVING COUNT(*) > 1
    `);
    console.log(`Found ${duplicates.rowCount} name overlaps.`);
    duplicates.rows.forEach(row => {
      console.log(`- ${row.name}: ${row.count} occurrences`);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
