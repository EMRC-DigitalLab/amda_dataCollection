import { NextFunction, Response } from 'express';
import { AuditLogSeverity } from '../../../database/entities/audit-log.entity';
import { UserRole } from '../../../database/entities/user.entity';
import { AuthenticatedRequest } from '../../../shared/middleware/auth.middleware';
import { AppError } from '../../../shared/middleware/error.middleware';
import { AuditLogService } from '../../../shared/utils/form-audit';
import { ResponseHelper } from '../../../shared/utils/response';

export class AuditLogController {
  private auditLogService: AuditLogService;

  constructor() {
    this.auditLogService = new AuditLogService();
  }

  /**
   * Get audit logs
   * GET /api/v1/audit-logs
   */
  getAuditLogs = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Ensure user is admin
      if (!req.user || !req.user.role.includes(UserRole.ADMIN)) {
        throw new AppError('Unauthorized access', 403);
      }

      const {
        userId,
        action,
        resourceType,
        startDate,
        endDate,
        severity,
        page = 1,
        limit = 20,
      } = req.query;

      const result = await this.auditLogService.getAuditLogs(
        {
          userId: userId as string,
          action: action as string,
          resourceType: resourceType as string,
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined,
          severity: severity as AuditLogSeverity,
        },
        Number(page),
        Number(limit)
      );

      ResponseHelper.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get audit statistics
   * GET /api/v1/audit-logs/stats
   */
  getAuditStats = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Ensure user is admin
      if (!req.user || !req.user.role.includes(UserRole.ADMIN)) {
        throw new AppError('Unauthorized access', 403);
      }

      const { days = 30 } = req.query;

      const stats = await this.auditLogService.getAuditStats(Number(days));

      ResponseHelper.success(res, stats);
    } catch (error) {
      next(error);
    }
  };
}
