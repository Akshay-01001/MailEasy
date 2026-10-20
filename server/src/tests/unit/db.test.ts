import { afterAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { db, pool } from '../../db/db.js';

describe('PostgreSQL connection', () => {
    afterAll(async () => {
        await pool.end();
    });

    it('should connect to PostgreSQL', async () => {
        const result = await db.execute(sql`SELECT 1 AS value`);

        expect(result.rows[0]).toEqual({ value: 1 });
    });
});
