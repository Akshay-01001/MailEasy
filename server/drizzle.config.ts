import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
}

export default defineConfig({
    out: './drizzle',
    dialect: 'postgresql',
    schema: './src/db/schema/index.ts',

    dbCredentials: {
        url: process.env.DATABASE_URL,
    },

    schemaFilter: ['public'],
    migrations: {
        table: '__drizzle_migrations__',
        schema: 'public',
    },

    verbose: true,
    strict: true,
});
