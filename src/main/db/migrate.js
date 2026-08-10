const fs = require('fs');
const path = require('path');
const { getPool, sql } = require('./pool');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationsTable() {
  const pool = getPool();
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='migrations' AND xtype='U')
    CREATE TABLE migrations (
      id INT IDENTITY(1,1) PRIMARY KEY,
      name NVARCHAR(255) NOT NULL UNIQUE,
      appliedAt DATETIME DEFAULT GETDATE()
    )
  `);
}

async function getAppliedMigrations() {
  const pool = getPool();
  const result = await pool.request().query('SELECT name FROM migrations');
  return new Set(result.recordset.map((r) => r.name));
}

async function runMigrations() {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const pool = getPool();

  for (const file of files) {
    if (applied.has(file)) continue;

    const sqlText = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const statements = sqlText
      .split(/^\s*GO\s*$/im)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const statement of statements) {
      await pool.request().query(statement);
    }

    await pool.request().input('name', sql.NVarChar, file).query('INSERT INTO migrations (name) VALUES (@name)');
    console.log(`✅ Migration uygulandı: ${file}`);
  }
}

module.exports = { runMigrations };
