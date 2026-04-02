export class ServiceError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "ServiceError";
    this.status = status;
    this.details = details;
  }
}
