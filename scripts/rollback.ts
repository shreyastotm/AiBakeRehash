import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

interface Migration {
  version: string;
  name: string;
  filePath: string;
}

interface RollbackFile {
  version: string;
  filePath: string;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

/**
 * Get list of rollback files
 */
function getRollbackFiles(): RollbackFile[] {
  const rollbackDir = path.join(process.cwd(), 'database', 'rollback');

  if (!fs.existsSync(rollbackDir)) {
    return [];
  }

  const files = fs.readdirSync(rollbackDir).filter((f) => f.endsWith('.sql'));

  const rollbacks: RollbackFile[] = files
    .sort()
    .map((file) => {
      const match = file.match(/^(\d+)_rollback\.sql$/);
      if (!match) return null;

      return {
        version: match[1],
        filePath: path.join(rollbackDir, file),
      };
    })
    .filter((r): r is RollbackFile => r !== null);

  return rollbacks;
}

/**
 * Get the last applied migration
 */
async function getLastAppliedMigration(client: any): Promise<Migration | null> {
  try {
    const result = await client.query(
      'SELECT version, name FROM schema_migrations ORDER BY version DESC LIMIT 1'
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      version: row.version,
      name: row.name,
      filePath: '', // Not needed for rollback
    };
  } catch (error) {
    console.error('✗ Failed to get last applied migration:', error);
    throw error;
  }
}

/**
 * Execute rollback for a migration
 */
async function executeRollback(
  client: any,
  migration: Migration,
  rollbackFile: RollbackFile
): Promise<void> {
  const sql = fs.readFileSync(rollbackFile.filePath, 'utf-8');

  try {
    await client.query(sql);
    await client.query('DELETE FROM schema_migrations WHERE version = $1', [
      migration.version,
    ]);
    console.log(
      `✓ Rolled back migration ${migration.version}: ${migration.name}`
    );
  } catch (error) {
    console.error(
      `✗ Failed to rollback migration ${migration.version}: ${migration.name}`
    );
    throw error;
  }
}

/**
 * Validate rollback execution
 */
async function validateRollback(client: any): Promise<void> {
  try {
    // Count tables
    const tableResult = await client.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    const tableCount = parseInt(tableResult.rows[0].count, 10);

    // Count indexes
    const indexResult = await client.query(`
      SELECT COUNT(*) as count FROM pg_indexes 
      WHERE schemaname = 'public'
    `);
    const indexCount = parseInt(indexResult.rows[0].count, 10);

    console.log(`\n✓ Validation Results:`);
    console.log(`  Tables remaining: ${tableCount}`);
    console.log(`  Indexes remaining: ${indexCount}`);
  } catch (error) {
    console.error('✗ Validation failed:', error);
    throw error;
  }
}

/**
 * Main rollback runner
 */
async function runRollback(): Promise<void> {
  const client = await pool.connect();

  try {
    console.log('🔄 Starting database rollback...\n');

    // Check if migrations table exists
    try {
      await client.query('SELECT 1 FROM schema_migrations LIMIT 1');
    } catch {
      console.log('ℹ No migrations table found. Nothing to rollback.');
      return;
    }

    // Get last applied migration
    const lastMigration = await getLastAppliedMigration(client);

    if (!lastMigration) {
      console.log('ℹ No migrations have been applied. Nothing to rollback.');
      return;
    }

    console.log(
      `Last applied migration: ${lastMigration.version} - ${lastMigration.name}\n`
    );

    // Get rollback files
    const rollbackFiles = getRollbackFiles();
    const rollbackFile = rollbackFiles.find(
      (r) => r.version === lastMigration.version
    );

    if (!rollbackFile) {
      console.error(
        `✗ No rollback file found for migration ${lastMigration.version}`
      );
      console.error(
        'Please create database/rollback/' +
          lastMigration.version +
          '_rollback.sql'
      );
      process.exit(1);
    }

    // Confirm rollback
    console.log(
      `⚠️  This will rollback migration ${lastMigration.version}: ${lastMigration.name}`
    );
    console.log('This action cannot be undone without re-running migrations.\n');

    // For non-interactive environments, proceed with rollback
    // In interactive environments, you might want to add a prompt here
    await executeRollback(client, lastMigration, rollbackFile);

    // Validate rollback
    console.log('\n📊 Validating rollback execution...');
    await validateRollback(client);

    console.log('\n✅ Database rollback completed successfully!');
  } catch (error) {
    console.error('\n❌ Rollback failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run rollback
runRollback().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
