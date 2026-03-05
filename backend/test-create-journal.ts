import { createJournalEntry } from './src/services/journal.service';
import { db } from './src/config/database';

async function test() {
    await db.connect();
    try {
        const res = await createJournalEntry(
            '098f7a27-b12c-469f-96b6-6e043a56ca81', // Existing recipe ID from user log
            'd943f167-cfa7-49c8-9a3d-800a55538c48', // Some user ID (might need a valid one from DB)
            {
                bake_date: new Date().toISOString(),
                notes: 'Test note',
                rating: 5
            }
        );
        console.log('Success:', res);
    } catch (err) {
        console.error('Error:', err);
    }
    process.exit(0);
}
test();
