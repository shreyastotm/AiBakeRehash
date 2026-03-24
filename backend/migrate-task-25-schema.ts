import { db } from './src/config/database';

async function migrate() {
    try {
        await db.connect();

        console.log('Starting migration...');

        await db.withTransaction(async (client) => {
            // 1. Make ingredient_master_id nullable in recipe_ingredients
            await client.query(`
                ALTER TABLE recipe_ingredients 
                ALTER COLUMN ingredient_master_id DROP NOT NULL;
            `);
            console.log('Made ingredient_master_id nullable.');

            // 2. Add business settings to users table
            await client.query(`
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS business_brand_name VARCHAR(255),
                ADD COLUMN IF NOT EXISTS business_manufacturer_name VARCHAR(255),
                ADD COLUMN IF NOT EXISTS business_manufacturer_address TEXT,
                ADD COLUMN IF NOT EXISTS business_fssai_license VARCHAR(255);
            `);
            console.log('Added business columns to users.');
        });

        console.log('Migration successful.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}
migrate();
