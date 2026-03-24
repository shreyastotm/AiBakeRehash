import { db } from './src/config/database';

async function migrate() {
    try {
        await db.connect();

        console.log('Starting migration for contact info...');

        await db.withTransaction(async (client) => {
            // Add business contact fields to users table
            await client.query(`
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS business_contact_number VARCHAR(255),
                ADD COLUMN IF NOT EXISTS business_email_id VARCHAR(255);
            `);
            console.log('Added business contact columns to users.');
        });

        console.log('Migration successful.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}
migrate();
