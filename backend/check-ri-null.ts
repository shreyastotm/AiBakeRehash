import { db } from './src/config/database';

async function check() {
    try {
        await db.connect();
        const res = await db.query(`
            SELECT column_name, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'recipe_ingredients' AND column_name = 'ingredient_master_id'
        `);
        console.log("RESULT=" + JSON.stringify(res.rows[0]));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
