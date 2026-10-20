import test from 'node:test';
import assert from 'node:assert/strict';
import { migrationChecksum } from '../src/db/migration-checksum.js';

test('migration checksums are stable across Windows and Unix line endings', () => {
  const sql = 'CREATE TABLE sample (id integer);\nINSERT INTO sample VALUES (1);\n';
  assert.equal(migrationChecksum(sql), migrationChecksum(sql.replace(/\n/g, '\r\n')));
});
