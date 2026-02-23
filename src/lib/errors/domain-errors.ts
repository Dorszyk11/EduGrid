/**
 * Base domain error classes.
 * All domain-specific errors extend DomainError.
 */

export class DomainError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    Object.setPrototypeOf(this, DomainError.prototype);
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super("NOT_FOUND", `${entity} with id "${id}" not found`);
    this.name = "NotFoundError";
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ValidationError extends DomainError {
  public readonly field: string | null;

  constructor(message: string, field: string | null = null) {
    super("VALIDATION_ERROR", message);
    this.name = "ValidationError";
    this.field = field;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class AuthorizationError extends DomainError {
  constructor(message: string = "Brak uprawnień") {
    super("AUTHORIZATION_ERROR", message);
    this.name = "AuthorizationError";
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super("CONFLICT", message);
    this.name = "ConflictError";
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Maps DomainError to HTTP status code.
 */
export function domainErrorToHttpStatus(error: DomainError): number {
  switch (error.code) {
    case "NOT_FOUND":
      return 404;
    case "VALIDATION_ERROR":
      return 400;
    case "AUTHORIZATION_ERROR":
      return 403;
    case "CONFLICT":
      return 409;
    default:
      return 500;
  }
}
