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

interface ValidationResult {
  tableCount: number;
  indexCount: number;
  dataCount: {
    [key: string]: number;
  };
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

/**
 * Get list of migration files in order
 */
function getMigrations(): Migration[] {
  const databaseDir = path.join(process.cwd(), 'database');
  const files = fs.readdirSync(databaseDir).filter((f) => f.endsWith('.sql'));

  const migrations: Migration[] = files
    .sort()
    .map((file) => {
      const match = file.match(/^(\d+)_(.+)\.sql$/);
      if (!match) return null;

      return {
        version: match[1],
        name: match[2],
        filePath: path.join(databaseDir, file),
      };
    })
    .filter((m): m is Migration => m !== null);

  return migrations;
}

/**
 * Initialize schema_migrations table if it doesn't exist
 */
async function initializeMigrationsTable(client: any): Promise<void> {
  const query = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      version TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      applied_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON schema_migrations(version);
  `;

  try {
    await client.query(query);
    console.log('✓ schema_migrations table initialized');
  } catch (error) {
    console.error('✗ Failed to initialize schema_migrations table:', error);
    throw error;
  }
}

/**
 * Get list of already applied migrations
 */
async function getAppliedMigrations(client: any): Promise<Set<string>> {
  try {
    const result = await client.query(
      'SELECT version FROM schema_migrations ORDER BY version'
    );
    return new Set(result.rows.map((row) => row.version));
  } catch (error) {
    // Table might not exist yet
    return new Set();
  }
}

/**
 * Read and execute a migration file
 */
async function executeMigration(
  client: any,
  migration: Migration
): Promise<void> {
  const sql = fs.readFileSync(migration.filePath, 'utf-8');

  try {
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
      [migration.version, migration.name]
    );
    console.log(`✓ Applied migration ${migration.version}: ${migration.name}`);
  } catch (error) {
    console.error(
      `✗ Failed to apply migration ${migration.version}: ${migration.name}`
    );
    throw error;
  }
}

/**
 * Validate migration execution
 */
async function validateMigration(client: any): Promise<ValidationResult> {
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

    // Count data in key tables
    const dataCount: { [key: string]: number } = {};
    const tables = [
      'users',
      'ingredient_master',
      'recipes',
      'recipe_ingredients',
      'recipe_sections',
      'recipe_steps',
      'recipe_versions',
      'recipe_journal_entries',
      'common_issues',
      'water_activity_reference',
      'ingredient_aliases',
      'composite_ingredients',
    ];

    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        dataCount[table] = parseInt(result.rows[0].count, 10);
      } catch {
        dataCount[table] = 0;
      }
    }

    return { tableCount, indexCount, dataCount };
  } catch (error) {
    console.error('✗ Validation failed:', error);
    throw error;
  }
}

/**
 * Main migration runner
 */
async function runMigrations(): Promise<void> {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting database migrations...\n');

    // Initialize migrations table
    await initializeMigrationsTable(client);

    // Get migrations
    const migrations = getMigrations();
    const appliedMigrations = await getAppliedMigrations(client);

    if (migrations.length === 0) {
      console.log('ℹ No migration files found');
      return;
    }

    console.log(`Found ${migrations.length} migration(s)\n`);

    // Execute pending migrations
    let executedCount = 0;
    for (const migration of migrations) {
      if (!appliedMigrations.has(migration.version)) {
        await executeMigration(client, migration);
        executedCount++;
      } else {
        console.log(
          `⊘ Skipped migration ${migration.version}: ${migration.name} (already applied)`
        );
      }
    }

    if (executedCount === 0) {
      console.log('\nℹ All migrations already applied');
    } else {
      console.log(`\n✓ Applied ${executedCount} new migration(s)`);
    }

    // Validate execution
    console.log('\n📊 Validating migration execution...');
    const validation = await validateMigration(client);

    console.log(`\n✓ Validation Results:`);
    console.log(`  Tables created: ${validation.tableCount}`);
    console.log(`  Indexes created: ${validation.indexCount}`);
    console.log(`\n  Data counts:`);
    for (const [table, count] of Object.entries(validation.dataCount)) {
      console.log(`    ${table}: ${count} rows`);
    }

    console.log('\n✅ Database migrations completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migrations
runMigrations().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
