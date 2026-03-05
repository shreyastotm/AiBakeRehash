import { db } from './src/config/database';

async function check() {
    await db.connect();
    const res = await db.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'recipe_journal_entries'
  `);
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
}
check();
