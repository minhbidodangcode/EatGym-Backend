import { createHash } from 'node:crypto';

// Git/Windows may check out SQL files with CRLF while the original migration
// was recorded with LF. Line endings do not change SQL semantics, so hash a
// canonical LF representation to keep applied checksums portable.
export function migrationChecksum(sql) {
  return createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex');
}
