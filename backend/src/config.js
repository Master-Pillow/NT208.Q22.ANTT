import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend/.env even when the server is started from the project root.
dotenv.config({ path: path.resolve(__dirname, '../.env') });
// Also allow a .env in the current working directory to override in other environments.
dotenv.config({ override: false });

const defaultDatabaseUrl = 'postgresql://postgres:123456@localhost:5432/LTWeb';

if (!process.env.DATABASE_URL) {
  console.warn(
    `[config] DATABASE_URL is missing. Using default local database: ${defaultDatabaseUrl}`
  );
}

export const config = {
  port: Number(process.env.PORT) || 4000,
  databaseUrl: process.env.DATABASE_URL || defaultDatabaseUrl,
  jwtSecret: process.env.JWT_SECRET || 'dev_secret',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.SMTP_USER || '',
  },
};
