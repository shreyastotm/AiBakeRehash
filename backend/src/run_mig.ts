import { db } from './config/database';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  try {
    const migrationPath = path.join(__dirname, 'migrations', '00Y_create_ignored_suggestions_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log('Running migration...');
    await db.query(sql);
    console.log('Migration successful');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

run();
