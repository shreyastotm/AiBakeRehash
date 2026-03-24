import fs from 'fs';
import path from 'path';
import { db } from './config/database';

async function run() {
    try {
        const sql = fs.readFileSync(path.resolve(__dirname, '../../database/migrations/20260308141811_add_recipe_tags.sql'), 'utf-8');
        await db.query(sql);
        console.log('Tags migrated successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        process.exit(0);
    }
}

run();
