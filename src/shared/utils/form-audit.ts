// services/audit-log.service.ts

import { Logger } from './forms-settings.logger';

export interface AuditLogEntry {
  action: string;
  resourceType: string;
  resourceId: string;
  adminId: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: Date;
}

export class AuditLogService {
  private logger: Logger;
  private auditLogs: AuditLogEntry[] = []; // In-memory storage for demo

  constructor() {
    this.logger = new Logger('AuditLogService');
  }

  /**
   * Log an audit event
   */
  async log(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
    try {
      const auditEntry: AuditLogEntry = {
        ...entry,
        timestamp: new Date(),
      };

      // Store in memory (in production, store in database)
      this.auditLogs.push(auditEntry);

      // Also log to console/file
      this.logger.info(`AUDIT: ${entry.action}`, {
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        adminId: entry.adminId,
        details: entry.details,
      });

      // In production, you would save to database:
      // await this.auditLogRepository.save(auditEntry);
    } catch (error) {
      this.logger.error('Failed to log audit event', error, { entry });
      // Don't throw error for audit logging failures
    }
  }

  /**
   * Get audit logs for a resource
   */
  async getAuditLogs(
    resourceType?: string,
    resourceId?: string,
    adminId?: string,
    limit: number = 100
  ): Promise<AuditLogEntry[]> {
    try {
      let filteredLogs = this.auditLogs;

      if (resourceType) {
        filteredLogs = filteredLogs.filter(log => log.resourceType === resourceType);
      }

      if (resourceId) {
        filteredLogs = filteredLogs.filter(log => log.resourceId === resourceId);
      }

      if (adminId) {
        filteredLogs = filteredLogs.filter(log => log.adminId === adminId);
      }

      // Sort by timestamp descending and limit
      return filteredLogs
        .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0))
        .slice(0, limit);
    } catch (error) {
      this.logger.error('Failed to get audit logs', error);
      return [];
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
      const recentLogs = this.auditLogs.filter(log => log.timestamp && log.timestamp > cutoffDate);

      const stats = {
        totalEvents: recentLogs.length,
        eventsByAction: {} as Record<string, number>,
        eventsByAdmin: {} as Record<string, number>,
        eventsByResource: {} as Record<string, number>,
      };

      recentLogs.forEach(log => {
        // Count by action
        stats.eventsByAction[log.action] = (stats.eventsByAction[log.action] || 0) + 1;

        // Count by admin
        stats.eventsByAdmin[log.adminId] = (stats.eventsByAdmin[log.adminId] || 0) + 1;

        // Count by resource type
        stats.eventsByResource[log.resourceType] =
          (stats.eventsByResource[log.resourceType] || 0) + 1;
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
      const initialCount = this.auditLogs.length;

      this.auditLogs = this.auditLogs.filter(log => !log.timestamp || log.timestamp > cutoffDate);

      const deletedCount = initialCount - this.auditLogs.length;

      if (deletedCount > 0) {
        this.logger.info(`Cleaned up ${deletedCount} old audit log entries`);
      }

      return deletedCount;
    } catch (error) {
      this.logger.error('Failed to cleanup audit logs', error);
      return 0;
    }
  }
}
