import pg from 'pg';
import { config } from './config.js';

// DB cloud (Neon/Supabase/Render) yêu cầu SSL; DB local thì không.
// → Tự bật SSL khi không phải localhost.
const isLocalDb = /localhost|127\.0\.0\.1/.test(config.databaseUrl || '');

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: isLocalDb ? false : { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('[postgres/pool] Unexpected idle client error:', err.message);
});
