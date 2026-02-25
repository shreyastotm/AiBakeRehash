# AiBake Database Setup Guide - DBeaver & PostgreSQL

## Prerequisites

Before starting, ensure you have:
- [ ] PostgreSQL 15 or higher installed
- [ ] DBeaver Community Edition (or Ultimate) installed
- [ ] PostgreSQL service running

---

## Step 1: Install PostgreSQL (if not already installed)

### Windows:
1. Download from: https://www.postgresql.org/download/windows/
2. Run installer, follow wizard
3. Remember the password you set for the `postgres` user
4. Default port: 5432

### Mac (using Homebrew):
```bash
brew install postgresql@15
brew services start postgresql@15
```

### Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install postgresql-15 postgresql-contrib
sudo systemctl start postgresql
```

---

## Step 2: Install DBeaver

1. Download from: https://dbeaver.io/download/
2. Choose Community Edition (free)
3. Install for your operating system

---

## Step 3: Create AiBake Database

### Option A: Using Command Line (Recommended)

```bash
# Connect as postgres user
psql -U postgres

# Create database
CREATE DATABASE aibake;

# Create dedicated user (optional but recommended)
CREATE USER aibake_user WITH PASSWORD 'your_secure_password_here';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE aibake TO aibake_user;

# Exit
\q
```

### Option B: Using pgAdmin or DBeaver
1. Right-click on "Databases"
2. Select "Create" → "Database"
3. Name: `aibake`
4. Owner: `postgres` (or create `aibake_user`)
5. Click "Save"

---

## Step 4: Connect DBeaver to PostgreSQL

1. **Open DBeaver**

2. **Create New Connection**
   - Click "Database" → "New Database Connection" (or click plug icon)
   - Select "PostgreSQL"
   - Click "Next"

3. **Configure Connection Settings**
   ```
   Host: localhost
   Port: 5432
   Database: aibake
   Username: postgres (or aibake_user)
   Password: [your password]
   ```

4. **Test Connection**
   - Click "Test Connection"
   - If first time, DBeaver will download PostgreSQL drivers
   - Should see "Connected" message
   - Click "Finish"

5. **Verify Connection**
   - Expand connection in left panel
   - You should see "aibake" database
   - Expand "Schemas" → "public"

---

## Step 5: Run Schema Initialization Script

1. **Open SQL Script**
   - In DBeaver, click "SQL Editor" → "New SQL Script"
   - Or press `Ctrl+]` (Windows/Linux) or `Cmd+]` (Mac)

2. **Load Schema Script**
   - Open the file: `01_schema_init.sql`
   - Copy entire contents
   - Paste into DBeaver SQL Editor

3. **Execute Script**
   - **IMPORTANT**: Make sure you're connected to the `aibake` database
   - Click "Execute SQL Script" button (or press `Ctrl+X` / `Cmd+X`)
   - **OR** highlight all and press `F5`

4. **Verify Execution**
   - Check the "Output" panel at bottom
   - Should see success messages:
     ```
     ✅ AiBake database schema created successfully!
     📊 Total tables created: 15
     🔑 Total indexes created: 25+
     ```
   - If errors occur, read error message carefully

5. **Refresh Schema View**
   - Right-click on "aibake" database in left panel
   - Select "Refresh"
   - Expand "Schemas" → "public" → "Tables"
   - You should now see 15 tables

---

## Step 6: Load Seed Data

1. **Open New SQL Script**
   - Create a new SQL editor tab

2. **Load Seed Script**
   - Open the file: `02_seed_data.sql`
   - Copy entire contents
   - Paste into DBeaver SQL Editor

3. **Execute Script**
   - Click "Execute SQL Script" (or `Ctrl+X` / `Cmd+X`)

4. **Verify Seed Data**
   - Should see messages:
     ```
     ✅ Seed data loaded successfully!
     📦 Ingredient Master: 70+ ingredients loaded
     🔄 Substitutions: 4 rules loaded
     🆘 Common Issues: 10 solutions loaded
     ```

5. **Verify Data in Tables**
   - In left panel, navigate to: `aibake` → `Schemas` → `public` → `Tables`
   - Right-click on `ingredient_master` table
   - Select "View Data" → "View All Data"
   - You should see 70+ ingredients with densities and nutrition data

---

## Step 7: Create Test Data (Optional)

1. **Open New SQL Script**

2. **Run Test Data Script**
   - Open the file: `03_test_data.sql` (if you have it)
   - Execute to create sample users and recipes

3. **Verify Test Data**
   ```sql
   -- Check users
   SELECT * FROM users;
   
   -- Check recipes
   SELECT * FROM recipes;
   
   -- Check ingredients with recipe
   SELECT 
     r.title,
     ri.display_name,
     ri.quantity_grams,
     im.name as canonical_name
   FROM recipes r
   JOIN recipe_ingredients ri ON ri.recipe_id = r.id
   JOIN ingredient_master im ON im.id = ri.ingredient_master_id
   ORDER BY r.title, ri.position;
   ```

---

## Step 8: Useful DBeaver Features

### 1. **Entity-Relationship Diagram (ERD)**
   - Right-click on database "aibake"
   - Select "View Diagram"
   - See visual representation of all tables and relationships
   - Great for understanding the schema

### 2. **Table Properties**
   - Right-click any table → "Properties"
   - See columns, constraints, indexes, triggers
   - View DDL (Data Definition Language)

### 3. **Data Export**
   - Right-click table → "Export Data"
   - Choose format (CSV, JSON, SQL, Excel)
   - Useful for backups or migrations

### 4. **SQL Editor Features**
   - Autocomplete: Start typing table/column names, press `Ctrl+Space`
   - Format SQL: Press `Ctrl+Shift+F`
   - Execute Current Statement: `Ctrl+Enter`
   - Execute Script: `Ctrl+X`

### 5. **Favorites**
   - Create frequently-used queries
   - Right-click in SQL editor → "Add to Favorites"

---

## Verification Checklist

Run these queries to verify everything is set up correctly:

```sql
-- 1. Check all tables exist (should return 15)
SELECT COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- 2. Check ingredient master is populated (should return 70+)
SELECT COUNT(*) as ingredient_count 
FROM ingredient_master;

-- 3. Check indexes exist
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 4. Check enum types exist
SELECT 
  t.typname as enum_name,
  e.enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname LIKE '%_type' OR t.typname LIKE '%_status' OR t.typname LIKE '%_impact'
ORDER BY t.typname, e.enumsortorder;

-- 5. Check foreign key relationships
SELECT
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;
```

Expected Results:
- ✅ 15 tables
- ✅ 70+ ingredients
- ✅ 25+ indexes
- ✅ 8 enum types
- ✅ Multiple foreign key relationships

---

## Common Issues & Solutions

### Issue 1: "Permission denied for database aibake"
**Solution:** Grant privileges to your user
```sql
GRANT ALL PRIVILEGES ON DATABASE aibake TO your_username;
GRANT ALL ON ALL TABLES IN SCHEMA public TO your_username;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO your_username;
```

### Issue 2: "Extension uuid-ossp does not exist"
**Solution:** Install extension as superuser
```sql
-- Connect as postgres superuser
psql -U postgres -d aibake

-- Then run
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Issue 3: "Type recipe_source_type already exists"
**Solution:** The script has already been run. Either:
- Drop and recreate database (if safe to do so)
- Skip to seed data script

### Issue 4: DBeaver can't connect to PostgreSQL
**Solutions:**
1. Verify PostgreSQL is running:
   - Windows: Check Services
   - Mac/Linux: `sudo systemctl status postgresql`
2. Check port 5432 is not blocked by firewall
3. Verify pg_hba.conf allows connections from localhost
4. Try connecting with `psql` command line first

### Issue 5: "password authentication failed"
**Solution:** Reset postgres user password
```bash
sudo -u postgres psql
ALTER USER postgres PASSWORD 'new_password';
\q
```

---

## Next Steps

After successful setup:

1. **Explore the Schema**
   - View ERD diagram
   - Understand table relationships
   - Review column data types

2. **Create Sample Recipes**
   - See `03_test_data.sql` for examples
   - Or manually insert via DBeaver's data editor

3. **Test Queries**
   - Try the sample queries in verification section
   - Practice JOIN queries across tables

4. **Backup Database**
   ```bash
   pg_dump -U postgres aibake > aibake_backup.sql
   ```

5. **Connect Your Application**
   - Connection string format:
   ```
   postgresql://username:password@localhost:5432/aibake
   ```

---

## DBeaver Keyboard Shortcuts (Handy Reference)

| Action | Windows/Linux | Mac |
|--------|--------------|-----|
| New SQL Editor | `Ctrl+]` | `Cmd+]` |
| Execute Statement | `Ctrl+Enter` | `Cmd+Enter` |
| Execute Script | `Ctrl+X` | `Cmd+X` |
| Format SQL | `Ctrl+Shift+F` | `Cmd+Shift+F` |
| Auto-complete | `Ctrl+Space` | `Ctrl+Space` |
| Open Table | `Ctrl+O` | `Cmd+O` |
| Commit | `Ctrl+Shift+End` | `Cmd+Shift+End` |
| Rollback | `Ctrl+Shift+Home` | `Cmd+Shift+Home` |

---

## Resources

- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **DBeaver Documentation**: https://dbeaver.com/docs/
- **SQL Tutorial**: https://www.postgresqltutorial.com/
- **AiBake Technical Docs**: See `AiBake_Complete_Technical_Architecture_v2.md`

---

## Support

If you encounter issues not covered here:

1. Check PostgreSQL logs:
   - Linux: `/var/log/postgresql/`
   - Mac (Homebrew): `/usr/local/var/log/`
   - Windows: `C:\Program Files\PostgreSQL\15\data\log\`

2. Review DBeaver error logs:
   - Help → Error Log

3. Common SQL commands:
```sql
-- List all tables
\dt

-- Describe table
\d table_name

-- Show current database
SELECT current_database();

-- Show current user
SELECT current_user;
```

---

**Setup Complete!** 🎉

Your AiBake database is now ready for development. You can start building the application using this schema as the foundation.
