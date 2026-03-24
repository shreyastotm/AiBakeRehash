import { db } from './src/config/database';

async function check() {
    try {
        await db.connect();
        const res = await db.query(`
            SELECT table_name, column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name IN ('recipes', 'recipe_ingredients', 'recipe_sections', 'recipe_steps', 'recipe_versions', 'recipe_version_snapshots')
            ORDER BY table_name, ordinal_position
        `);


        console.log(JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
