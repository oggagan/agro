export { Role, UserStatus, CompanyType, DirectorType, AuditAction } from '../../prisma/generated/prisma/client.js';

export interface JwtPayload {
  userId: string;
  role: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message: string;
  meta?: PaginatedResult<unknown>['meta'];
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

export interface AuditLogInput {
  action: string;
  entityType: string;
  entityId: string;
  performedBy: string;
  performedByRole: string;
  previousData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface StatusHistoryInput {
  entityType: string;
  entityId: string;
  fromStatus: string | null;
  toStatus: string;
  reason?: string | null;
  changedBy: string;
  changedByRole: string;
}
