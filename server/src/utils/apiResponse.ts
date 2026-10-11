import type { Response } from 'express';

export const successResponse = <T = unknown>(
    res: Response,
    statusCode: number = 200,
    message: string = 'Success',
    data: T | null = null,
) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
};

export const errorResponse = <T = unknown>(
    res: Response,
    statusCode: number = 500,
    message: string = 'Internal server error',
    data: T | null = null,
) => {
    return res.status(statusCode).json({
        success: false,
        message,
        data,
    });
};
