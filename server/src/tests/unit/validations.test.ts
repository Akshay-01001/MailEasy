import { describe, expect, it } from 'vitest';
import {
    registerSchema,
    loginSchema,
    isValidTimezone,
} from '../../utils/validations.js';

describe('registerSchema', () => {
    const validPayload = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
    };

    it('should pass with valid required fields', () => {
        const { error, value } = registerSchema.validate(validPayload);
        expect(error).toBeUndefined();
        expect(value).toMatchObject(validPayload);
    });

    it('should pass with all optional fields', () => {
        const payload = { ...validPayload, timezone: 'Asia/Kolkata' };
        const { error, value } = registerSchema.validate(payload);
        expect(error).toBeUndefined();
        expect(value.timezone).toBe('Asia/Kolkata');
    });

    it('should trim name and email', () => {
        const payload = {
            ...validPayload,
            name: '  John Doe  ',
            email: '  john@example.com  ',
        };
        const { error, value } = registerSchema.validate(payload);
        expect(error).toBeUndefined();
        expect(value.name).toBe('John Doe');
        expect(value.email).toBe('john@example.com');
    });

    // --- name validations ---

    it('should fail when name is missing', () => {
        const { name: _, ...payload } = validPayload;
        const { error } = registerSchema.validate(payload);
        expect(error).toBeDefined();
        expect(error!.details[0].message).toContain('Name is required');
    });

    it('should fail when name is empty', () => {
        const { error } = registerSchema.validate({ ...validPayload, name: '' });
        expect(error).toBeDefined();
        expect(error!.details[0].message).toContain('Name is required');
    });

    it('should fail when name is shorter than 2 characters', () => {
        const { error } = registerSchema.validate({ ...validPayload, name: 'A' });
        expect(error).toBeDefined();
        expect(error!.details[0].message).toContain('at least 2 characters');
    });

    it('should fail when name exceeds 100 characters', () => {
        const { error } = registerSchema.validate({
            ...validPayload,
            name: 'A'.repeat(101),
        });
        expect(error).toBeDefined();
        expect(error!.details[0].message).toContain('cannot exceed 100');
    });

    // --- email validations ---

    it('should fail when email is missing', () => {
        const { email: _, ...payload } = validPayload;
        const { error } = registerSchema.validate(payload);
        expect(error).toBeDefined();
        expect(error!.details[0].message).toContain('Email is required');
    });

    it('should fail when email is invalid', () => {
        const { error } = registerSchema.validate({
            ...validPayload,
            email: 'not-an-email',
        });
        expect(error).toBeDefined();
        expect(error!.details[0].message).toContain('valid email');
    });

    // --- password validations ---

    it('should fail when password is missing', () => {
        const { password: _, ...payload } = validPayload;
        const { error } = registerSchema.validate(payload);
        expect(error).toBeDefined();
        expect(error!.details[0].message).toContain('Password is required');
    });

    it('should fail when password is shorter than 6 characters', () => {
        const { error } = registerSchema.validate({
            ...validPayload,
            password: '12345',
        });
        expect(error).toBeDefined();
        expect(error!.details[0].message).toContain('at least 6 characters');
    });

    // --- timezone validations ---

    it('should default timezone to UTC when not provided', () => {
        const { error, value } = registerSchema.validate(validPayload);
        expect(error).toBeUndefined();
        expect(value.timezone).toBe('UTC');
    });

    it('should accept a valid IANA timezone', () => {
        const { error, value } = registerSchema.validate({
            ...validPayload,
            timezone: 'Asia/Kolkata',
        });
        expect(error).toBeUndefined();
        expect(value.timezone).toBe('Asia/Kolkata');
    });

    it('should fall back to UTC for an invalid timezone string', () => {
        const { error, value } = registerSchema.validate({
            ...validPayload,
            timezone: 'Not/A_Real_Zone',
        });
        expect(error).toBeUndefined();
        expect(value.timezone).toBe('UTC');
    });

    it('should fall back to UTC when timezone is empty string', () => {
        const { error, value } = registerSchema.validate({
            ...validPayload,
            timezone: '',
        });
        expect(error).toBeUndefined();
        expect(value.timezone).toBe('UTC');
    });

    it('should fall back to UTC when timezone is null', () => {
        const { error, value } = registerSchema.validate({
            ...validPayload,
            timezone: null,
        });
        expect(error).toBeUndefined();
        expect(value.timezone).toBe('UTC');
    });
});

describe('loginSchema', () => {
    const validPayload = {
        email: 'john@example.com',
        password: 'password123',
    };

    it('should pass with valid credentials', () => {
        const { error, value } = loginSchema.validate(validPayload);
        expect(error).toBeUndefined();
        expect(value).toMatchObject(validPayload);
    });

    it('should trim email', () => {
        const { error, value } = loginSchema.validate({
            ...validPayload,
            email: '  john@example.com  ',
        });
        expect(error).toBeUndefined();
        expect(value.email).toBe('john@example.com');
    });

    it('should fail when email is missing', () => {
        const { error } = loginSchema.validate({ password: 'password123' });
        expect(error).toBeDefined();
        expect(error!.details[0].message).toContain('Email is required');
    });

    it('should fail when email is invalid', () => {
        const { error } = loginSchema.validate({
            ...validPayload,
            email: 'bad',
        });
        expect(error).toBeDefined();
        expect(error!.details[0].message).toContain('valid email');
    });

    it('should fail when password is missing', () => {
        const { error } = loginSchema.validate({
            email: 'john@example.com',
        });
        expect(error).toBeDefined();
        expect(error!.details[0].message).toContain('Password is required');
    });

    it('should fail when password is empty', () => {
        const { error } = loginSchema.validate({
            ...validPayload,
            password: '',
        });
        expect(error).toBeDefined();
        expect(error!.details[0].message).toContain('Password is required');
    });
});


describe('isValidTimezone', () => {
    it('should return true for valid IANA timezones', () => {
        expect(isValidTimezone('UTC')).toBe(true);
        expect(isValidTimezone('Asia/Kolkata')).toBe(true);
        expect(isValidTimezone('America/New_York')).toBe(true);
        expect(isValidTimezone('Europe/London')).toBe(true);
    });

    it('should return false for invalid timezone strings', () => {
        expect(isValidTimezone('Not/Real')).toBe(false);
        expect(isValidTimezone('IST')).toBe(false);
    });

    it('should accept case-insensitive UTC variants', () => {
        expect(isValidTimezone('utc')).toBe(true);
        expect(isValidTimezone('UTC')).toBe(true);
    });
});
