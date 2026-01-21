import { AppDataSource } from '@/config';
import { AuditLog, AuditLogSeverity } from '@/database/entities/audit-log.entity';
import { DataSource, Repository } from 'typeorm';
import { Logger } from './forms-settings.logger';

export interface AuditLogEntry {
  action: string;
  resourceType: string;
  resourceId?: string;
  userId?: string;
  memberId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  severity?: AuditLogSeverity;
  isSuccess?: boolean;
  errorMessage?: string;
}

export class AuditLogService {
  private logger: Logger;
  private repository: Repository<AuditLog>;

  constructor(dataSource?: DataSource) {
    this.logger = new Logger('AuditLogService');
    const source = dataSource || AppDataSource;
    this.repository = source.getRepository(AuditLog);
  }

  /**
   * Log an audit event
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {

      const logEntry = this.repository.create({
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        userId: entry.userId,
        memberId: entry.memberId,
        details: entry.details,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        severity: entry.severity || AuditLogSeverity.INFO,
        isSuccess: entry.isSuccess ?? true,
        errorMessage: entry.errorMessage,
      });


      await this.repository.save(logEntry);

      // Also log to console for immediate visibility
      this.logger.info(`AUDIT: ${entry.action}`, {
        userId: entry.userId,
        memberId: entry.memberId,
        resource: `${entry.resourceType}:${entry.resourceId}`,
        success: entry.isSuccess,
      });
    } catch (error) {
      // Fallback logging if DB fails
      this.logger.error('Failed to log audit event to DB', error, { entry });
    }
  }

  /**
   * Helper to log login events
   */
  async logLogin(
    id: string,
    userType: 'admin' | 'member',
    isSuccess: boolean,
    ipAddress?: string,
    userAgent?: string,
    error?: string
  ) {

    const entry: AuditLogEntry = {
      action: 'LOGIN',
      resourceType: 'Auth',
      ipAddress,
      userAgent,
      isSuccess,
      errorMessage: error,
      severity: isSuccess ? AuditLogSeverity.INFO : AuditLogSeverity.WARNING,
      details: { timestamp: new Date() },
    };

    if (userType === 'admin') {
      entry.userId = id;
    } else {
      entry.memberId = id;
    }

    await this.log(entry);
  }

  /**
   * Helper to log application errors
   */
  async logError(error: Error, context: any = {}, userId?: string) {
    await this.log({
      action: 'SYSTEM_ERROR',
      resourceType: 'System',
      userId,
      severity: AuditLogSeverity.ERROR,
      isSuccess: false,
      errorMessage: error.message,
      details: {
        stack: error.stack,
        context,
      },
    });
  }

  /**
   * Helper to log member creation
   */
  async logMemberCreated(memberId: string, adminId?: string, details?: any) {
    await this.log({
      action: 'MEMBER_CREATED',
      resourceType: 'Member',
      resourceId: memberId,
      userId: adminId,
      memberId,
      details,
      isSuccess: true,
    });
  }

  /**
   * Helper to log member updates
   */
  async logMemberUpdated(memberId: string, adminId?: string, changes?: any) {
    await this.log({
      action: 'MEMBER_UPDATED',
      resourceType: 'Member',
      resourceId: memberId,
      userId: adminId,
      memberId,
      details: { changes },
      isSuccess: true,
    });
  }

  /**
   * Helper to log member verification
   */
  async logMemberVerified(memberId: string, adminId?: string) {
    await this.log({
      action: 'MEMBER_VERIFIED',
      resourceType: 'Member',
      resourceId: memberId,
      userId: adminId,
      memberId,
      isSuccess: true,
    });
  }

  /**
   * Helper to log member deletion
   */
  async logMemberDeleted(memberId: string, adminId?: string) {
    await this.log({
      action: 'MEMBER_DELETED',
      resourceType: 'Member',
      resourceId: memberId,
      userId: adminId,
      severity: AuditLogSeverity.WARNING,
      isSuccess: true,
    });
  }

  /**
   * Helper to log minigrid site creation
   */
  async logSiteCreated(siteId: string, memberId: string, siteName: string) {
    await this.log({
      action: 'SITE_CREATED',
      resourceType: 'MinigridSite',
      resourceId: siteId,
      memberId,
      details: { siteName },
      isSuccess: true,
    });
  }

  /**
   * Helper to log minigrid site updates
   */
  async logSiteUpdated(siteId: string, memberId?: string, changes?: any) {
    await this.log({
      action: 'SITE_UPDATED',
      resourceType: 'MinigridSite',
      resourceId: siteId,
      memberId,
      details: { changes },
      isSuccess: true,
    });
  }

  /**
   * Helper to log minigrid site deletion
   */
  async logSiteDeleted(siteId: string, memberId?: string) {
    await this.log({
      action: 'SITE_DELETED',
      resourceType: 'MinigridSite',
      resourceId: siteId,
      memberId,
      severity: AuditLogSeverity.WARNING,
      isSuccess: true,
    });
  }

  /**
   * Helper to log form submission
   */
  async logFormSubmission(
    formId: string,
    submissionId: string,
    memberId: string,
    formTitle: string,
    isUpdate: boolean = false
  ) {
    await this.log({
      action: isUpdate ? 'FORM_SUBMISSION_UPDATED' : 'FORM_SUBMISSION',
      resourceType: 'FormSubmission',
      resourceId: submissionId,
      memberId,
      details: { formId, formTitle, isUpdate },
      isSuccess: true,
    });
  }

  /**
   * Helper to log logout
   */
  async logLogout(id: string, userType: 'admin' | 'member', ipAddress?: string) {
    const entry: AuditLogEntry = {
      action: 'LOGOUT',
      resourceType: 'Auth',
      ipAddress,
      isSuccess: true,
    };

    if (userType === 'admin') {
      entry.userId = id;
    } else {
      entry.memberId = id;
    }

    await this.log(entry);
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(
    filters: {
      userId?: string;
      memberId?: string;
      action?: string;
      resourceType?: string;
      startDate?: Date;
      endDate?: Date;
      severity?: AuditLogSeverity;
    },
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: AuditLog[]; total: number; page: number; limit: number }> {
    try {
      const query = this.repository.createQueryBuilder('log')
        .leftJoinAndSelect('log.user', 'user')
        .leftJoinAndSelect('log.member', 'member')
        .orderBy('log.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      if (filters.userId) {
        query.andWhere('log.userId = :userId', { userId: filters.userId });
      }
      if (filters.memberId) {
        query.andWhere('log.memberId = :memberId', { memberId: filters.memberId });
      }
      if (filters.action) {
        query.andWhere('log.action = :action', { action: filters.action });
      }
      if (filters.resourceType) {
        query.andWhere('log.resourceType = :resourceType', { resourceType: filters.resourceType });
      }
      if (filters.severity) {
        query.andWhere('log.severity = :severity', { severity: filters.severity });
      }
      if (filters.startDate) {
        query.andWhere('log.createdAt >= :startDate', { startDate: filters.startDate });
      }
      if (filters.endDate) {
        query.andWhere('log.createdAt <= :endDate', { endDate: filters.endDate });
      }

      const [data, total] = await query.getManyAndCount();

      return { data, total, page, limit };
    } catch (error) {
      this.logger.error('Failed to get audit logs', error);
      throw error;
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStats(days: number = 30): Promise<{
    totalEvents: number;
    eventsByAction: Record<string, number>;
    eventsByAdmin: Record<string, number>;
    eventsByResource: Record<string, number>;
  }> {
    try {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const recentLogs = await this.repository.createQueryBuilder('log')
        .where('log.createdAt > :date', { date: cutoffDate })
        .getMany();

      const stats = {
        totalEvents: recentLogs.length,
        eventsByAction: {} as Record<string, number>,
        eventsByAdmin: {} as Record<string, number>, // Kept for compat
        eventsByUser: {} as Record<string, number>,
        eventsByResource: {} as Record<string, number>,
        eventsBySeverity: {} as Record<string, number>,
      };

      recentLogs.forEach(log => {
        stats.eventsByAction[log.action] = (stats.eventsByAction[log.action] || 0) + 1;
        if (log.userId) {
          stats.eventsByUser[log.userId] = (stats.eventsByUser[log.userId] || 0) + 1;
        }
        if (log.resourceType) {
          stats.eventsByResource[log.resourceType] = (stats.eventsByResource[log.resourceType] || 0) + 1;
        }
        stats.eventsBySeverity[log.severity] = (stats.eventsBySeverity[log.severity] || 0) + 1;
      });

      return stats;
    } catch (error) {
      this.logger.error('Failed to get audit stats', error);
      return {
        totalEvents: 0,
        eventsByAction: {},
        eventsByAdmin: {},
        eventsByResource: {},
      };
    }
  }

  /**
   * Clear old audit logs (cleanup)
   */
  async cleanup(olderThanDays: number = 365): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
      const deleted = await this.repository.createQueryBuilder()
        .delete()
        .from(AuditLog)
        .where('createdAt < :date', { date: cutoffDate })
        .execute();

      return deleted.affected || 0;
    } catch (error) {
      this.logger.error('Failed to cleanup audit logs', error);
      return 0;
    }
  }
}
