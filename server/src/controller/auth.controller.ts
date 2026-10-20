import type { Request, Response } from 'express';
import { users } from '../db/schema/index.js';
import { db } from '../db/db.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { registerSchema, loginSchema } from '../utils/validations.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const register = async (req: Request, res: Response) => {
    try {
        const { error, value } = registerSchema.validate(req.body, {
            abortEarly: false,
        });

        if (error) {
            return errorResponse(
                res,
                400,
                error.details[0]?.message || 'Validation error',
                error.details.map((detail) => detail.message),
            );
        }

        const [existingUser] = await db
            .select()
            .from(users)
            .where(eq(users.email, value.email))
            .limit(1);

        if (existingUser) {
            return errorResponse(
                res,
                409,
                'Account already exists with this email',
            );
        }

        const passwordHash = await bcrypt.hash(value.password, 10);

        const [createdUser] = await db
            .insert(users)
            .values({
                name: value.name,
                email: value.email,
                password: passwordHash,
                authProvider: 'credentials',
                timezone: value.timezone,
            })
            .returning({
                id: users.id,
                name: users.name,
                email: users.email,
                authProvider: users.authProvider,
                isVerified: users.isVerified,
                timezone: users.timezone,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt,
            });

        return successResponse(
            res,
            201,
            'User registered successfully',
            createdUser,
        );
    } catch (error) {
        console.error('Error in register controller:', error);
        return errorResponse(res, 500, 'Internal server error');
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { error, value } = loginSchema.validate(req.body, {
            abortEarly: false,
        });

        if (error) {
            return errorResponse(
                res,
                400,
                error.details[0]?.message || 'Validation error',
                error.details.map((detail) => detail.message),
            );
        }

        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, value.email))
            .limit(1);

        if (!user) {
            return errorResponse(res, 401, 'Invalid email or password');
        }

        if (user.authProvider !== 'credentials' || !user.password) {
            return errorResponse(
                res,
                400,
                `This account was registered using ${user.authProvider}. Please sign in with ${user.authProvider}.`,
            );
        }

        const isPasswordValid = await bcrypt.compare(
            value.password,
            user.password,
        );

        if (!isPasswordValid) {
            return errorResponse(res, 401, 'Invalid email or password');
        }

        const { password: _, ...safeUser } = user;

        return successResponse(res, 200, 'Login successful', safeUser);
    } catch (error) {
        console.error('Error in login controller:', error);
        return errorResponse(res, 500, 'Internal server error');
    }
};
