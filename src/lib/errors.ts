/**
 * Application-wide error types for structured error handling.
 * Every service layer function should throw one of these instead of raw errors.
 */

export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "DUPLICATE_ENTRY"
  | "RATE_LIMITED"
  | "SUBSCRIPTION_REQUIRED"
  | "FEATURE_NOT_AVAILABLE"
  | "EXTERNAL_API_ERROR"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(
    message: string,
    code: ErrorCode = "INTERNAL_ERROR",
    statusCode = 500,
    details?: unknown
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, "VALIDATION_ERROR", 400, details);
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "No autenticado") {
    super(message, "UNAUTHORIZED", 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Acceso denegado") {
    super(message, "FORBIDDEN", 403);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} no encontrado`, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

export class SubscriptionError extends AppError {
  constructor(message = "Se requiere suscripción activa") {
    super(message, "SUBSCRIPTION_REQUIRED", 402);
    this.name = "SubscriptionError";
  }
}

export class FeatureError extends AppError {
  constructor(feature: string, requiredPlan: string) {
    super(
      `La función "${feature}" requiere plan ${requiredPlan}`,
      "FEATURE_NOT_AVAILABLE",
      403
    );
    this.name = "FeatureError";
  }
}

/** Converts any thrown value into a serializable API error response */
export function toApiError(err: unknown): { error: { code: string; message: string; details?: unknown } } {
  if (err instanceof AppError) {
    return err.toJSON();
  }
  if (err instanceof Error) {
    return {
      error: { code: "INTERNAL_ERROR", message: err.message },
    };
  }
  return {
    error: { code: "INTERNAL_ERROR", message: "Error desconocido" },
  };
}
