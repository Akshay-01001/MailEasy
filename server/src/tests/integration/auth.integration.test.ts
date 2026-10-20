import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { sql } from 'drizzle-orm';
import { db, pool } from '../../db/db.js';
import app from '../../app.js';

const TEST_USER = {
    name: 'Test User',
    email: `testuser_${Date.now()}@example.com`,
    password: 'securePass123',
    timezone: 'Asia/Kolkata',
};

describe('Auth API - Integration Tests', () => {
    beforeAll(async () => {
        // Make sure the DB is reachable
        await db.execute(sql`SELECT 1`);
    });

    afterAll(async () => {
        // Clean up the test user
        await db.execute(
            sql`DELETE FROM users WHERE email = ${TEST_USER.email}`,
        );
        await pool.end();
    });

    // ───────────────────────────────────────────────
    // POST /api/auth/register
    // ───────────────────────────────────────────────
    describe('POST /api/auth/register', () => {
        // Clean up before each register test so they're independent
        beforeEach(async () => {
            await db.execute(
                sql`DELETE FROM users WHERE email = ${TEST_USER.email}`,
            );
        });

        it('should register a new user successfully', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send(TEST_USER);

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('User registered successfully');
            expect(res.body.data).toMatchObject({
                name: TEST_USER.name,
                email: TEST_USER.email,
                authProvider: 'credentials',
                isVerified: false,
                timezone: TEST_USER.timezone,
            });
            // password must NOT be returned
            expect(res.body.data.password).toBeUndefined();
            // should have generated an id
            expect(res.body.data.id).toBeDefined();
        });

        it('should register without optional fields', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: TEST_USER.name,
                    email: TEST_USER.email,
                    password: TEST_USER.password,
                });

            expect(res.status).toBe(201);
            expect(res.body.data.timezone).toBe('UTC');
        });

        it('should fall back to UTC for an invalid timezone', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: TEST_USER.name,
                    email: TEST_USER.email,
                    password: TEST_USER.password,
                    timezone: 'Invalid/Zone',
                });

            expect(res.status).toBe(201);
            expect(res.body.data.timezone).toBe('UTC');
        });

        it('should return 409 when email already exists', async () => {
            // Register first
            await request(app).post('/api/auth/register').send(TEST_USER);

            // Try to register again with same email
            const res = await request(app)
                .post('/api/auth/register')
                .send(TEST_USER);

            expect(res.status).toBe(409);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('already exists');
        });

        it('should return 400 with missing required fields', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.data).toBeInstanceOf(Array);
            expect(res.body.data.length).toBeGreaterThan(0);
        });

        it('should return 400 with invalid email', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ ...TEST_USER, email: 'not-an-email' });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should return 400 when password is too short', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ ...TEST_USER, password: '123' });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should return 400 when name is too short', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ ...TEST_USER, name: 'A' });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should default timezone to UTC when not provided', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: TEST_USER.name,
                    email: TEST_USER.email,
                    password: TEST_USER.password,
                });

            expect(res.status).toBe(201);
            expect(res.body.data.timezone).toBe('UTC');
        });
    });

    // ───────────────────────────────────────────────
    // POST /api/auth/login
    // ───────────────────────────────────────────────
    describe('POST /api/auth/login', () => {
        beforeAll(async () => {
            // Ensure a user exists for login tests
            await db.execute(
                sql`DELETE FROM users WHERE email = ${TEST_USER.email}`,
            );
            await request(app).post('/api/auth/register').send(TEST_USER);
        });

        it('should login successfully with correct credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: TEST_USER.email, password: TEST_USER.password });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Login successful');
            expect(res.body.data).toMatchObject({
                name: TEST_USER.name,
                email: TEST_USER.email,
                authProvider: 'credentials',
            });
            // password must NOT be returned
            expect(res.body.data.password).toBeUndefined();
        });

        it('should return 401 with wrong password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: TEST_USER.email,
                    password: 'wrongPassword!',
                });

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('Invalid email or password');
        });

        it('should return 401 with non-existent email', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'password123',
                });

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('Invalid email or password');
        });

        it('should return 400 when email is missing', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ password: 'password123' });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should return 400 when password is missing', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: TEST_USER.email });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should return 400 when body is empty', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.data).toBeInstanceOf(Array);
        });

        it('should return 400 with invalid email format', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'bad-email', password: 'password123' });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });
});
