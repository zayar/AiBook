import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export interface CustomError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        statusCode = 409;
        message = 'Duplicate record error';
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Record not found';
        break;
      case 'P2003':
        statusCode = 400;
        message = 'Foreign key constraint error';
        break;
      default:
        statusCode = 400;
        message = 'Database error';
    }
  }

  // Validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Validation error';
  }

  // Firebase Auth errors
  if (error.code?.startsWith('auth/')) {
    statusCode = 401;
    message = 'Authentication error';
  }

  // Log errors in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', error);
  }

  res.status(statusCode).json({
    error: {
      message,
      statusCode,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    },
  });
};

export class AppError extends Error implements CustomError {
  statusCode: number;
  
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
    
    Error.captureStackTrace(this, this.constructor);
  }
} 