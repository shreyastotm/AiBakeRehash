import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

interface ForeignKeyIssue {
  constraint_name: string;
  table_name: string;
  column_name: string;
  referenced_table: string;
  referenced_column: string;
  status: 'valid' | 'orphaned' | 'missing_reference';
  orphaned_count?: number;
}

interface MissingIndexIssue {
  table_name: string;
  column_name: string;
  foreign_key_name: string;
  severity: 'high' | 'medium';
}

interface EnumIssue {
  enum_type: string;
  table_name: string;
  column_name: string;
  invalid_values?: string[];
  status: 'valid' | 'inconsistent' | 'unused';
}

interface ValidationReport {
  timestamp: string;
  database: string;
  tables: {
    count: number;
    list: string[];
  };
  indexes: {
    count: number;
    byTable: { [key: string]: number };
  };
  data: {
    [key: string]: number;
  };
  migrations: {
    applied: number;
    list: Array<{ version: string; name: string; applied_at: string }>;
  };
  enums: {
    count: number;
    list: string[];
  };
  functions: {
    count: number;
    list: string[];
  };
  triggers: {
    count: number;
    list: string[];
  };
  validation: {
    foreignKeys: {
      total: number;
      valid: number;
      issues: ForeignKeyIssue[];
    };
    indexes: {
      total: number;
      missing: MissingIndexIssue[];
    };
    enums: {
      total: number;
      issues: EnumIssue[];
    };
  };
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

/**
 * Validate foreign key relationships
 * Checks for orphaned records and missing references
 */
async function validateForeignKeys(client: any): Promise<{
  total: number;
  valid: number;
  issues: ForeignKeyIssue[];
}> {
  const issues: ForeignKeyIssue[] = [];

  // Get all foreign key constraints
  const fkResult = await client.query(`
    SELECT
      tc.constraint_name,
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS referenced_table,
      ccu.column_name AS referenced_column
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
    ORDER BY tc.table_name, tc.constraint_name
  `);

  const totalFKs = fkResult.rows.length;

  // Check each foreign key for orphaned records
  for (const fk of fkResult.rows) {
    try {
      const orphanResult = await client.query(`
        SELECT COUNT(*) as orphaned_count
        FROM ${fk.table_name} t
        LEFT JOIN ${fk.referenced_table} r
          ON t.${fk.column_name} = r.${fk.referenced_column}
        WHERE t.${fk.column_name} IS NOT NULL
          AND r.${fk.referenced_column} IS NULL
      `);

      const orphanedCount = parseInt(orphanResult.rows[0].orphaned_count, 10);

      if (orphanedCount > 0) {
        issues.push({
          constraint_name: fk.constraint_name,
          table_name: fk.table_name,
          column_name: fk.column_name,
          referenced_table: fk.referenced_table,
          referenced_column: fk.referenced_column,
          status: 'orphaned',
          orphaned_count: orphanedCount,
        });
      }
    } catch (error) {
      issues.push({
        constraint_name: fk.constraint_name,
        table_name: fk.table_name,
        column_name: fk.column_name,
        referenced_table: fk.referenced_table,
        referenced_column: fk.referenced_column,
        status: 'missing_reference',
      });
    }
  }

  return {
    total: totalFKs,
    valid: totalFKs - issues.length,
    issues,
  };
}

/**
 * Check for missing indexes on foreign key columns
 */
async function validateForeignKeyIndexes(client: any): Promise<MissingIndexIssue[]> {
  const issues: MissingIndexIssue[] = [];

  // Get all foreign key columns
  const fkResult = await client.query(`
    SELECT
      tc.constraint_name,
      tc.table_name,
      kcu.column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.column_name
  `);

  // Check if each foreign key column has an index
  for (const fk of fkResult.rows) {
    const indexResult = await client.query(`
      SELECT COUNT(*) as index_count
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = $1
        AND indexdef LIKE '%' || $2 || '%'
    `, [fk.table_name, fk.column_name]);

    const indexCount = parseInt(indexResult.rows[0].index_count, 10);

    if (indexCount === 0) {
      issues.push({
        table_name: fk.table_name,
        column_name: fk.column_name,
        foreign_key_name: fk.constraint_name,
        severity: fk.table_name === 'recipe_journal_entries' ? 'high' : 'medium',
      });
    }
  }

  return issues;
}

/**
 * Validate ENUM type usage consistency
 */
async function validateEnumUsage(client: any): Promise<EnumIssue[]> {
  const issues: EnumIssue[] = [];

  // Get all ENUM types and their values
  const enumResult = await client.query(`
    SELECT
      t.typname as enum_type,
      e.enumlabel as enum_value
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typnamespace = (
      SELECT oid FROM pg_namespace WHERE nspname = 'public'
    )
    ORDER BY t.typname, e.enumsortorder
  `);

  const enumsByType: { [key: string]: string[] } = {};
  for (const row of enumResult.rows) {
    if (!enumsByType[row.enum_type]) {
      enumsByType[row.enum_type] = [];
    }
    enumsByType[row.enum_type].push(row.enum_value);
  }

  // Find columns using each ENUM type
  const columnResult = await client.query(`
    SELECT
      t.typname as enum_type,
      c.table_name,
      c.column_name
    FROM information_schema.columns c
    JOIN pg_type t ON c.udt_name = t.typname
    WHERE c.table_schema = 'public'
      AND t.typtype = 'e'
    ORDER BY t.typname, c.table_name
  `);

  // Check for invalid values in ENUM columns
  for (const col of columnResult.rows) {
    try {
      const validValues = enumsByType[col.enum_type] || [];
      const valueList = validValues.map(v => `'${v}'`).join(',');

      const invalidResult = await client.query(`
        SELECT DISTINCT ${col.column_name} as invalid_value
        FROM ${col.table_name}
        WHERE ${col.column_name} IS NOT NULL
          AND ${col.column_name}::text NOT IN (${valueList})
      `);

      if (invalidResult.rows.length > 0) {
        issues.push({
          enum_type: col.enum_type,
          table_name: col.table_name,
          column_name: col.column_name,
          invalid_values: invalidResult.rows.map(r => r.invalid_value),
          status: 'inconsistent',
        });
      }
    } catch (error) {
      // Column might be unused or have other issues
    }
  }

  return issues;
}

/**
 * Generate database documentation from schema
 */
async function generateSchemaDocumentation(client: any): Promise<string> {
  let documentation = '# AiBake Database Schema Documentation\n\n';
  documentation += `Generated: ${new Date().toISOString()}\n\n`;

  // Get all tables
  const tableResult = await client.query(`
    SELECT
      t.table_name,
      obj_description((t.table_schema||'.'||t.table_name)::regclass, 'pg_class') as table_comment
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name
  `);

  documentation += '## Tables\n\n';

  for (const table of tableResult.rows) {
    documentation += `### ${table.table_name}\n\n`;

    if (table.table_comment) {
      documentation += `${table.table_comment}\n\n`;
    }

    // Get columns for this table
    const columnResult = await client.query(`
      SELECT
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        col_description((t.table_schema||'.'||t.table_name)::regclass, c.ordinal_position) as column_comment
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON c.table_name = t.table_name
        AND c.table_schema = t.table_schema
      WHERE t.table_schema = 'public'
        AND t.table_name = $1
      ORDER BY c.ordinal_position
    `, [table.table_name]);

    documentation += '| Column | Type | Nullable | Default | Comment |\n';
    documentation += '|--------|------|----------|---------|----------|\n';

    for (const col of columnResult.rows) {
      const nullable = col.is_nullable === 'YES' ? 'Yes' : 'No';
      const defaultVal = col.column_default || '-';
      const comment = col.column_comment || '-';
      documentation += `| ${col.column_name} | ${col.data_type} | ${nullable} | ${defaultVal} | ${comment} |\n`;
    }

    documentation += '\n';

    // Get indexes for this table
    const indexResult = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = $1
      ORDER BY indexname
    `, [table.table_name]);

    if (indexResult.rows.length > 0) {
      documentation += '**Indexes:**\n';
      for (const idx of indexResult.rows) {
        documentation += `- ${idx.indexname}\n`;
      }
      documentation += '\n';
    }

    // Get foreign keys for this table
    const fkResult = await client.query(`
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name as referenced_table,
        ccu.column_name as referenced_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = $1
      ORDER BY tc.constraint_name
    `, [table.table_name]);

    if (fkResult.rows.length > 0) {
      documentation += '**Foreign Keys:**\n';
      for (const fk of fkResult.rows) {
        documentation += `- ${fk.column_name} → ${fk.referenced_table}.${fk.referenced_column}\n`;
      }
      documentation += '\n';
    }
  }

  return documentation;
}

/**
 * Get all tables in the public schema
 */
async function getTables(client: any): Promise<string[]> {
  const result = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  return result.rows.map((row) => row.table_name);
}

/**
 * Get all indexes
 */
async function getIndexes(client: any): Promise<{ [key: string]: number }> {
  const result = await client.query(`
    SELECT tablename, COUNT(*) as count FROM pg_indexes 
    WHERE schemaname = 'public'
    GROUP BY tablename
    ORDER BY tablename
  `);

  const byTable: { [key: string]: number } = {};
  for (const row of result.rows) {
    byTable[row.tablename] = parseInt(row.count, 10);
  }
  return byTable;
}

/**
 * Get data counts for key tables
 */
async function getDataCounts(client: any, tables: string[]): Promise<{ [key: string]: number }> {
  const counts: { [key: string]: number } = {};

  for (const table of tables) {
    try {
      const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
      counts[table] = parseInt(result.rows[0].count, 10);
    } catch {
      counts[table] = 0;
    }
  }

  return counts;
}

/**
 * Get applied migrations
 */
async function getMigrations(
  client: any
): Promise<Array<{ version: string; name: string; applied_at: string }>> {
  try {
    const result = await client.query(
      'SELECT version, name, applied_at FROM schema_migrations ORDER BY version'
    );
    return result.rows.map((row) => ({
      version: row.version,
      name: row.name,
      applied_at: row.applied_at.toISOString(),
    }));
  } catch {
    return [];
  }
}

/**
 * Get all ENUM types
 */
async function getEnums(client: any): Promise<string[]> {
  const result = await client.query(`
    SELECT typname FROM pg_type 
    WHERE typtype = 'e' AND typnamespace = (
      SELECT oid FROM pg_namespace WHERE nspname = 'public'
    )
    ORDER BY typname
  `);
  return result.rows.map((row) => row.typname);
}

/**
 * Get all functions
 */
async function getFunctions(client: any): Promise<string[]> {
  const result = await client.query(`
    SELECT p.proname FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    ORDER BY p.proname
  `);
  return result.rows.map((row) => row.proname);
}

/**
 * Get all triggers
 */
async function getTriggers(client: any): Promise<string[]> {
  const result = await client.query(`
    SELECT trigger_name FROM information_schema.triggers 
    WHERE trigger_schema = 'public'
    ORDER BY trigger_name
  `);
  return result.rows.map((row) => row.trigger_name);
}

/**
 * Generate validation report
 */
async function generateReport(): Promise<ValidationReport> {
  const client = await pool.connect();

  try {
    const tables = await getTables(client);
    const indexesByTable = await getIndexes(client);
    const dataCounts = await getDataCounts(client, tables);
    const migrations = await getMigrations(client);
    const enums = await getEnums(client);
    const functions = await getFunctions(client);
    const triggers = await getTriggers(client);

    // New validation checks
    const foreignKeyValidation = await validateForeignKeys(client);
    const missingIndexes = await validateForeignKeyIndexes(client);
    const enumIssues = await validateEnumUsage(client);

    const totalIndexes = Object.values(indexesByTable).reduce((a, b) => a + b, 0);

    return {
      timestamp: new Date().toISOString(),
      database: process.env.DATABASE_URL?.split('/').pop() || 'unknown',
      tables: {
        count: tables.length,
        list: tables,
      },
      indexes: {
        count: totalIndexes,
        byTable: indexesByTable,
      },
      data: dataCounts,
      migrations: {
        applied: migrations.length,
        list: migrations,
      },
      enums: {
        count: enums.length,
        list: enums,
      },
      functions: {
        count: functions.length,
        list: functions,
      },
      triggers: {
        count: triggers.length,
        list: triggers,
      },
      validation: {
        foreignKeys: foreignKeyValidation,
        indexes: {
          total: missingIndexes.length,
          missing: missingIndexes,
        },
        enums: {
          total: enumIssues.length,
          issues: enumIssues,
        },
      },
    };
  } finally {
    client.release();
  }
}

/**
 * Print validation report
 */
function printReport(report: ValidationReport): void {
  console.log('\n📊 AiBake Database Validation Report');
  console.log('═'.repeat(60));
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Database: ${report.database}\n`);

  console.log('📋 Schema Objects');
  console.log('─'.repeat(60));
  console.log(`Tables:     ${report.tables.count}`);
  console.log(`Indexes:    ${report.indexes.count}`);
  console.log(`ENUM Types: ${report.enums.count}`);
  console.log(`Functions:  ${report.functions.count}`);
  console.log(`Triggers:   ${report.triggers.count}\n`);

  console.log('📦 Tables');
  console.log('─'.repeat(60));
  for (const table of report.tables.list) {
    const count = report.data[table] || 0;
    const indexes = report.indexes.byTable[table] || 0;
    console.log(`  ${table.padEnd(35)} ${count.toString().padStart(6)} rows  ${indexes} indexes`);
  }

  console.log('\n🔄 Migrations');
  console.log('─'.repeat(60));
  console.log(`Applied: ${report.migrations.applied}\n`);
  for (const migration of report.migrations.list) {
    console.log(`  ${migration.version.padEnd(5)} ${migration.name.padEnd(30)} ${migration.applied_at}`);
  }

  console.log('\n📝 ENUM Types');
  console.log('─'.repeat(60));
  for (const enumType of report.enums.list) {
    console.log(`  ${enumType}`);
  }

  console.log('\n⚙️  Functions');
  console.log('─'.repeat(60));
  for (const func of report.functions.list) {
    console.log(`  ${func}`);
  }

  console.log('\n🔔 Triggers');
  console.log('─'.repeat(60));
  for (const trigger of report.triggers.list) {
    console.log(`  ${trigger}`);
  }

  // Validation Results
  console.log('\n🔍 Validation Results');
  console.log('─'.repeat(60));

  // Foreign Key Validation
  console.log(`\n  Foreign Keys: ${report.validation.foreignKeys.valid}/${report.validation.foreignKeys.total} valid`);
  if (report.validation.foreignKeys.issues.length > 0) {
    console.log('  ⚠️  Issues found:');
    for (const issue of report.validation.foreignKeys.issues) {
      console.log(`    - ${issue.table_name}.${issue.column_name} → ${issue.referenced_table}.${issue.referenced_column}`);
      console.log(`      Status: ${issue.status}${issue.orphaned_count ? ` (${issue.orphaned_count} orphaned records)` : ''}`);
    }
  } else {
    console.log('  ✅ All foreign keys valid');
  }

  // Missing Indexes
  console.log(`\n  Foreign Key Indexes: ${report.validation.indexes.total} missing`);
  if (report.validation.indexes.missing.length > 0) {
    console.log('  ⚠️  Missing indexes:');
    for (const missing of report.validation.indexes.missing) {
      console.log(`    - ${missing.table_name}.${missing.column_name} [${missing.severity}]`);
    }
  } else {
    console.log('  ✅ All foreign key columns indexed');
  }

  // ENUM Validation
  console.log(`\n  ENUM Types: ${report.validation.enums.total} issues`);
  if (report.validation.enums.issues.length > 0) {
    console.log('  ⚠️  Issues found:');
    for (const issue of report.validation.enums.issues) {
      console.log(`    - ${issue.table_name}.${issue.column_name} (${issue.enum_type})`);
      console.log(`      Status: ${issue.status}`);
      if (issue.invalid_values) {
        console.log(`      Invalid values: ${issue.invalid_values.join(', ')}`);
      }
    }
  } else {
    console.log('  ✅ All ENUM types consistent');
  }

  console.log('\n' + '═'.repeat(60));
  console.log('✅ Validation complete\n');
}


/**
 * Main validation runner
 */
async function runValidation(): Promise<void> {
  const client = await pool.connect();

  try {
    console.log('🔍 Validating AiBake database...\n');
    const report = await generateReport();
    printReport(report);

    // Generate schema documentation
    console.log('📚 Generating schema documentation...');
    const documentation = await generateSchemaDocumentation(client);
    
    // Save documentation to file
    const fs = await import('fs').then(m => m.promises);
    const docsPath = path.join(process.cwd(), '..', 'docs', 'database', 'schema.md');
    await fs.mkdir(path.dirname(docsPath), { recursive: true });
    await fs.writeFile(docsPath, documentation);
    console.log(`✅ Schema documentation saved to ${docsPath}\n`);

    // Output JSON for programmatic use
    console.log('📄 JSON Report:');
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run validation
runValidation().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
