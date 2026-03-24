import { db } from './src/config/database';

async function check() {
    try {
        await db.connect();
        const res = await db.query(`
            SELECT 
                conname as constraint_name,
                conrelid::regclass as table_name,
                pg_get_constraintdef(c.oid) as constraint_definition
            FROM pg_constraint c
            JOIN pg_namespace n ON n.oid = c.connamespace
            WHERE n.nspname = 'public'
            AND conrelid IN ('recipes'::regclass, 'recipe_ingredients'::regclass, 'recipe_sections'::regclass, 'recipe_steps'::regclass)
            ORDER BY table_name, constraint_name
        `);
        console.log(JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
