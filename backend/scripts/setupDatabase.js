import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');
const shouldReset = process.argv.includes('--reset');
const includeLargeDemo = process.argv.includes('--large');

async function readSql(relativePath) {
  return fs.readFile(path.join(rootDir, relativePath), 'utf8');
}

async function databaseHasAdvisorHubSchema() {
  const result = await pool.query(`
    SELECT to_regclass('public.students') IS NOT NULL AS exists
  `);
  return result.rows[0].exists;
}

async function main() {
  const hasSchema = await databaseHasAdvisorHubSchema();

  if (hasSchema && !shouldReset) {
    throw new Error(
      'Database đã có bảng students. Dừng để bảo vệ dữ liệu. Dùng npm run db:reset chỉ khi muốn tạo lại dữ liệu demo.'
    );
  }

  const schemaSql = await readSql('database/schema_demo.sql');
  const gradeSyncSql = await readSql('database/grade_daa_sync.sql');

  console.log('[db:setup] Đang tạo schema và dữ liệu demo...');
  await pool.query(schemaSql);
  await pool.query(gradeSyncSql);

  if (includeLargeDemo) {
    console.log('[db:setup] Đang bổ sung bộ dữ liệu demo lớn...');
    const largeDemoSql = await readSql('backend/sql/large_demo_seed_uit_700_plus.sql');
    await pool.query(largeDemoSql);
  }

  const counts = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM students) AS students,
      (SELECT COUNT(*)::int FROM users) AS users,
      (SELECT COUNT(*)::int FROM courses) AS courses,
      (SELECT COUNT(*)::int FROM enrollments) AS enrollments,
      (SELECT COUNT(*)::int FROM grades) AS grades
  `);

  console.log('[db:setup] Hoàn tất:', counts.rows[0]);
}

main()
  .catch((error) => {
    console.error('[db:setup]', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
