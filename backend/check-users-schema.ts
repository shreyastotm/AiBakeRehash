import { db } from './src/config/database';

async function check() {
    try {
        await db.connect();
        const res = await db.query(`
            SELECT column_name
            FROM information_schema.columns 
            WHERE table_name = 'users'
            ORDER BY column_name
        `);
        console.log("USERS_COLUMNS_START");
        res.rows.forEach(r => console.log(r.column_name));
        console.log("USERS_COLUMNS_END");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
