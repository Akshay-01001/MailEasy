import { describe, expect, it } from 'vitest';
import { registerSchema, loginSchema } from '../../utils/validations.js';

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
        const payload = { ...validPayload, gender: 'male', age: 25 };
        const { error, value } = registerSchema.validate(payload);
        expect(error).toBeUndefined();
        expect(value.gender).toBe('male');
        expect(value.age).toBe(25);
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

    // --- age validations ---

    it('should fail when age is less than 1', () => {
        const { error } = registerSchema.validate({
            ...validPayload,
            age: 0,
        });
        expect(error).toBeDefined();
    });

    it('should fail when age exceeds 120', () => {
        const { error } = registerSchema.validate({
            ...validPayload,
            age: 121,
        });
        expect(error).toBeDefined();
    });

    it('should allow null or empty gender', () => {
        const r1 = registerSchema.validate({ ...validPayload, gender: null });
        expect(r1.error).toBeUndefined();

        const r2 = registerSchema.validate({ ...validPayload, gender: '' });
        expect(r2.error).toBeUndefined();
    });

    it('should allow null age', () => {
        const { error } = registerSchema.validate({
            ...validPayload,
            age: null,
        });
        expect(error).toBeUndefined();
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
