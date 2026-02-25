import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs/promises';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string[];
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

/**
 * Check 1: Verify all required tables exist
 */
async function checkRequiredTables(client: any): Promise<CheckResult> {
  const requiredTables = [
    'users',
    'ingredient_master',
    'recipes',
    'recipe_ingredients',
    'recipe_sections',
    'recipe_steps',
    'recipe_versions',
    'recipe_version_snapshots',
    'recipe_journal_entries',
    'recipe_audio_notes',
    'ingredient_substitutions',
    'timer_instances',
    'recipe_nutrition_cache',
    'common_issues',
    'water_activity_reference',
    'ingredient_aliases',
    'composite_ingredients',
    'composite_ingredient_components',
    'inventory_items',
    'inventory_purchases',
    'suppliers',
    'recipe_costs',
    'packaging_items',
    'delivery_zones',
  ];

  const result = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);

  const existingTables = result.rows.map((r: any) => r.table_name);
  const missingTables = requiredTables.filter(t => !existingTables.includes(t));

  if (missingTables.length === 0) {
    return {
      name: 'Required Tables',
      status: 'pass',
      message: `All ${requiredTables.length} required tables exist`,
    };
  }

  return {
    name: 'Required Tables',
    status: 'fail',
    message: `Missing ${missingTables.length} required tables`,
    details: missingTables,
  };
}

/**
 * Check 2: Verify all required ENUM types exist
 */
async function checkRequiredEnums(client: any): Promise<CheckResult> {
  const requiredEnums = [
    'recipe_source_type',
    'recipe_status',
    'unit_system',
    'section_type',
    'ingredient_category',
    'timer_status',
    'substitution_moisture_impact',
    'substitution_structural_impact',
  ];

  const result = await client.query(`
    SELECT typname FROM pg_type 
    WHERE typtype = 'e' AND typnamespace = (
      SELECT oid FROM pg_namespace WHERE nspname = 'public'
    )
  `);

  const existingEnums = result.rows.map((r: any) => r.typname);
  const missingEnums = requiredEnums.filter(e => !existingEnums.includes(e));

  if (missingEnums.length === 0) {
    return {
      name: 'Required ENUM Types',
      status: 'pass',
      message: `All ${requiredEnums.length} required ENUM types exist`,
    };
  }

  return {
    name: 'Required ENUM Types',
    status: 'fail',
    message: `Missing ${missingEnums.length} required ENUM types`,
    details: missingEnums,
  };
}

/**
 * Check 3: Verify all required indexes exist
 */
async function checkRequiredIndexes(client: any): Promise<CheckResult> {
  const requiredIndexes = [
    { table: 'users', column: 'email' },
    { table: 'ingredient_master', column: 'name' },
    { table: 'recipes', column: 'user_id' },
    { table: 'recipes', column: 'status' },
    { table: 'recipe_ingredients', column: 'recipe_id' },
    { table: 'recipe_ingredients', column: 'ingredient_master_id' },
    { table: 'recipe_journal_entries', column: 'recipe_id' },
    { table: 'recipe_journal_entries', column: 'bake_date' },
    { table: 'inventory_items', column: 'user_id' },
    { table: 'inventory_items', column: 'expiration_date' },
    { table: 'recipe_costs', column: 'recipe_id' },
  ];

  const result = await client.query(`
    SELECT tablename, indexdef FROM pg_indexes 
    WHERE schemaname = 'public'
  `);

  const existingIndexes = result.rows.map((r: any) => ({
    table: r.tablename,
    def: r.indexdef,
  }));

  const missingIndexes = requiredIndexes.filter(req => {
    return !existingIndexes.some(idx => 
      idx.table === req.table && idx.def.includes(req.column)
    );
  });

  if (missingIndexes.length === 0) {
    return {
      name: 'Required Indexes',
      status: 'pass',
      message: `All ${requiredIndexes.length} required indexes exist`,
    };
  }

  return {
    name: 'Required Indexes',
    status: 'warning',
    message: `Missing ${missingIndexes.length} recommended indexes`,
    details: missingIndexes.map(idx => `${idx.table}.${idx.column}`),
  };
}

/**
 * Check 4: Verify foreign key constraints
 */
async function checkForeignKeyConstraints(client: any): Promise<CheckResult> {
  const result = await client.query(`
    SELECT COUNT(*) as count FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public'
  `);

  const fkCount = parseInt(result.rows[0].count, 10);

  if (fkCount >= 20) {
    return {
      name: 'Foreign Key Constraints',
      status: 'pass',
      message: `${fkCount} foreign key constraints defined`,
    };
  }

  return {
    name: 'Foreign Key Constraints',
    status: 'warning',
    message: `Only ${fkCount} foreign key constraints found (expected 20+)`,
  };
}

/**
 * Check 5: Verify seed data loaded
 */
async function checkSeedData(client: any): Promise<CheckResult> {
  const result = await client.query(`
    SELECT 
      (SELECT COUNT(*) FROM ingredient_master) as ingredients,
      (SELECT COUNT(*) FROM common_issues) as issues,
      (SELECT COUNT(*) FROM water_activity_reference) as water_activity
  `);

  const { ingredients, issues, water_activity } = result.rows[0];

  const details: string[] = [];
  let status: 'pass' | 'fail' | 'warning' = 'pass';

  if (ingredients < 70) {
    details.push(`Only ${ingredients} ingredients (expected 70+)`);
    status = 'warning';
  } else {
    details.push(`✓ ${ingredients} ingredients loaded`);
  }

  if (issues < 10) {
    details.push(`Only ${issues} common issues (expected 10+)`);
    status = 'warning';
  } else {
    details.push(`✓ ${issues} common issues loaded`);
  }

  if (water_activity < 5) {
    details.push(`Only ${water_activity} water activity references (expected 5+)`);
    status = 'warning';
  } else {
    details.push(`✓ ${water_activity} water activity references loaded`);
  }

  return {
    name: 'Seed Data',
    status,
    message: `Seed data validation: ${status === 'pass' ? 'complete' : 'incomplete'}`,
    details,
  };
}

/**
 * Check 6: Verify database functions exist
 */
async function checkDatabaseFunctions(client: any): Promise<CheckResult> {
  const requiredFunctions = [
    'search_ingredient',
    'get_recipe_ingredients_expanded',
    'calculate_composite_nutrition',
    'calculate_hydration_percentage',
    'get_recipe_with_details',
  ];

  const result = await client.query(`
    SELECT p.proname FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
  `);

  const existingFunctions = result.rows.map((r: any) => r.proname);
  const missingFunctions = requiredFunctions.filter(f => !existingFunctions.includes(f));

  if (missingFunctions.length === 0) {
    return {
      name: 'Database Functions',
      status: 'pass',
      message: `All ${requiredFunctions.length} required functions exist`,
    };
  }

  return {
    name: 'Database Functions',
    status: 'warning',
    message: `Missing ${missingFunctions.length} database functions`,
    details: missingFunctions,
  };
}

/**
 * Check 7: Verify database triggers exist
 */
async function checkDatabaseTriggers(client: any): Promise<CheckResult> {
  const result = await client.query(`
    SELECT COUNT(*) as count FROM information_schema.triggers 
    WHERE trigger_schema = 'public'
  `);

  const triggerCount = parseInt(result.rows[0].count, 10);

  if (triggerCount >= 3) {
    return {
      name: 'Database Triggers',
      status: 'pass',
      message: `${triggerCount} triggers defined`,
    };
  }

  return {
    name: 'Database Triggers',
    status: 'warning',
    message: `Only ${triggerCount} triggers found (expected 3+)`,
  };
}

/**
 * Check 8: Verify no orphaned foreign key records
 */
async function checkOrphanedRecords(client: any): Promise<CheckResult> {
  const details: string[] = [];
  let hasOrphans = false;

  // Check recipe_ingredients -> recipes
  const ingredientsResult = await client.query(`
    SELECT COUNT(*) as count FROM recipe_ingredients ri
    LEFT JOIN recipes r ON ri.recipe_id = r.id
    WHERE r.id IS NULL
  `);

  if (parseInt(ingredientsResult.rows[0].count, 10) > 0) {
    details.push(`Orphaned recipe_ingredients: ${ingredientsResult.rows[0].count}`);
    hasOrphans = true;
  }

  // Check recipe_journal_entries -> recipes
  const journalResult = await client.query(`
    SELECT COUNT(*) as count FROM recipe_journal_entries rj
    LEFT JOIN recipes r ON rj.recipe_id = r.id
    WHERE r.id IS NULL
  `);

  if (parseInt(journalResult.rows[0].count, 10) > 0) {
    details.push(`Orphaned recipe_journal_entries: ${journalResult.rows[0].count}`);
    hasOrphans = true;
  }

  if (!hasOrphans) {
    return {
      name: 'Orphaned Records',
      status: 'pass',
      message: 'No orphaned foreign key records found',
    };
  }

  return {
    name: 'Orphaned Records',
    status: 'fail',
    message: `Found orphaned records`,
    details,
  };
}

/**
 * Run all checks
 */
async function runAllChecks(): Promise<CheckResult[]> {
  const client = await pool.connect();
  const results: CheckResult[] = [];

  try {
    console.log('🔍 Running comprehensive database checks...\n');

    results.push(await checkRequiredTables(client));
    results.push(await checkRequiredEnums(client));
    results.push(await checkRequiredIndexes(client));
    results.push(await checkForeignKeyConstraints(client));
    results.push(await checkSeedData(client));
    results.push(await checkDatabaseFunctions(client));
    results.push(await checkDatabaseTriggers(client));
    results.push(await checkOrphanedRecords(client));
  } finally {
    client.release();
  }

  return results;
}

/**
 * Print check results
 */
function printResults(results: CheckResult[]): void {
  console.log('\n📋 Database Check Results');
  console.log('═'.repeat(70));

  let passCount = 0;
  let failCount = 0;
  let warningCount = 0;

  for (const result of results) {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️ ';
    console.log(`\n${icon} ${result.name}`);
    console.log(`   ${result.message}`);

    if (result.details && result.details.length > 0) {
      for (const detail of result.details) {
        console.log(`   • ${detail}`);
      }
    }

    if (result.status === 'pass') passCount++;
    else if (result.status === 'fail') failCount++;
    else warningCount++;
  }

  console.log('\n' + '═'.repeat(70));
  console.log(`Summary: ${passCount} passed, ${warningCount} warnings, ${failCount} failed`);
  console.log('═'.repeat(70) + '\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    const results = await runAllChecks();
    printResults(results);
  } catch (error) {
    console.error('❌ Database check failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
