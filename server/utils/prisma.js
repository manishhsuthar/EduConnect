const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const globalForPrisma = global;
const databaseUrl = process.env.DATABASE_URL;

if (typeof databaseUrl !== 'string' || !databaseUrl.trim()) {
  throw new Error(
    'DATABASE_URL is missing. Add it to server/.env or project-root .env before starting the server.'
  );
}

const pool = globalForPrisma.prismaPool || new Pool({
  connectionString: databaseUrl,
});

const adapter = new PrismaPg(pool);

const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaPool = pool;
}

module.exports = prisma;
