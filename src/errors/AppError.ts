export type ErrorType = 'network' | 'validation' | 'auth' | 'unknown';

export class AppError extends Error {
  public timestamp: number;
  
  constructor(
    public type: ErrorType,
    public message: string,
    public code?: number,
    public original?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    this.timestamp = Date.now();
  }
}

export class ServiceError extends AppError {
  constructor(
    public service: 'ai' | 'speech' | 'animation',
    type: ErrorType,
    message: string,
    code?: number,
    public statusCode?: number,
    public retry?: boolean
  ) {
    super(type, message, code);
    this.name = 'ServiceError';
  }
}