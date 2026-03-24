
const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

async function checkTable() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });
    try {
        await client.connect();
        const res = await client.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_tags')");
        console.log(res.rows[0].exists ? 'EXISTS' : 'NOT_FOUND');
    } catch (err) {
        console.error(err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

checkTable();
