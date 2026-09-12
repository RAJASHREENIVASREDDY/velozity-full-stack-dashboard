export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(400, "BAD_REQUEST", message, details);
  }
  static unauthorized(message = "Authentication required"): ApiError {
    return new ApiError(401, "UNAUTHORIZED", message);
  }
  static forbidden(message = "You do not have permission to access this resource"): ApiError {
    return new ApiError(403, "FORBIDDEN", message);
  }
  static notFound(message = "Resource not found"): ApiError {
    return new ApiError(404, "NOT_FOUND", message);
  }
  static conflict(message: string): ApiError {
    return new ApiError(409, "CONFLICT", message);
  }
}

export function success<T>(data: T): { success: true; data: T } {
  return { success: true, data };
}
