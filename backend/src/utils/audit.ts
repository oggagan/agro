import prisma from '../config/database.js';
import type { AuditLogInput, StatusHistoryInput } from '../types/index.js';
import logger from '../config/logger.js';

export async function createAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action as any,
        entityType: input.entityType,
        entityId: input.entityId,
        performedBy: input.performedBy,
        performedByRole: input.performedByRole,
        previousData: (input.previousData ?? undefined) as any,
        newData: (input.newData ?? undefined) as any,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (error) {
    logger.error('Failed to create audit log:', error);
  }
}

export async function createStatusHistory(input: StatusHistoryInput): Promise<void> {
  try {
    await prisma.statusHistory.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        reason: input.reason ?? null,
        changedBy: input.changedBy,
        changedByRole: input.changedByRole,
      },
    });
  } catch (error) {
    logger.error('Failed to create status history:', error);
  }
}
