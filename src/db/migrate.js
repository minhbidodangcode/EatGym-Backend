import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';
import { migrationChecksum } from './migration-checksum.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = path.resolve(currentDirectory, '../../sql');

async function migrate() {
  const files = (await readdir(migrationsDirectory))
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .sort();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const filename of files) {
      const sql = await readFile(path.join(migrationsDirectory, filename), 'utf8');
      const checksum = migrationChecksum(sql);
      const existing = await client.query(
        'SELECT checksum FROM schema_migrations WHERE filename = $1',
        [filename]
      );

      if (existing.rowCount > 0) {
        if (existing.rows[0].checksum !== checksum) {
          throw new Error(`Migration ${filename} was modified after being applied.`);
        }
        continue;
      }

      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)',
        [filename, checksum]
      );
      console.info(`Applied ${filename}`);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error('Migration failed:', error.message);
  process.exitCode = 1;
});
