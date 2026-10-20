import { describe, expect, it, vi } from 'vitest';
import { successResponse, errorResponse } from '../../utils/apiResponse.js';
import type { Response } from 'express';

function createMockResponse() {
    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    return res;
}

describe('successResponse', () => {
    it('should return correct shape with defaults', () => {
        const res = createMockResponse();
        successResponse(res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: 'Success',
            data: null,
        });
    });

    it('should return custom status, message, and data', () => {
        const res = createMockResponse();
        const data = { id: '123', name: 'Test' };
        successResponse(res, 201, 'Created', data);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: 'Created',
            data,
        });
    });
});

describe('errorResponse', () => {
    it('should return correct shape with defaults', () => {
        const res = createMockResponse();
        errorResponse(res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Internal server error',
            data: null,
        });
    });

    it('should return custom status, message, and error data', () => {
        const res = createMockResponse();
        const errors = ['Field is required'];
        errorResponse(res, 400, 'Validation error', errors);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Validation error',
            data: errors,
        });
    });
});
