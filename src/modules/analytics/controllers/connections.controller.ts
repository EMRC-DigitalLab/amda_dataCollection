// @ts-nocheck
import { Request, Response } from 'express';
import { AppDataSource } from '../../../config/database';
import { ConnectionsAnalyticsService } from '../services/connections-analytics.service';

export class ConnectionsAnalyticsController {
  private connectionsAnalyticsService: ConnectionsAnalyticsService;

  constructor() {
    this.connectionsAnalyticsService = new ConnectionsAnalyticsService(AppDataSource);
  }

  /**
   * Get comprehensive connections analytics data
   * GET /api/analytics/connections/overview
   */
  async getConnectionsOverview(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        country: req.query.country as string,
        organizationType: req.query.organizationType as string,
        membershipTier: req.query.membershipTier as string,
        includeInactive: req.query.includeInactive === 'true'
      };

      const analytics = await this.connectionsAnalyticsService.getConnectionsAnalytics(filters);

      res.status(200).json({
        success: true,
        message: 'Connections analytics retrieved successfully',
        data: analytics,
      });
    } catch (error) {
      console.error('Error fetching connections analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve connections analytics',
        error: error.message,
      });
    }
  }

  /**
   * Get membership trends data
   * GET /api/analytics/connections/trends
   */
  async getMembershipTrends(req: Request, res: Response): Promise<void> {
    try {
      const analytics = await this.connectionsAnalyticsService.getConnectionsAnalytics();

      res.status(200).json({
        success: true,
        message: 'Membership trends retrieved successfully',
        data: {
          trends: analytics.membershipTrends,
          overview: {
            totalMembers: analytics.overview.totalMembers,
            growthRate: analytics.overview.growthRate,
            newMembersThisMonth: analytics.overview.newMembersThisMonth
          }
        },
      });
    } catch (error) {
      console.error('Error fetching membership trends:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve membership trends',
        error: error.message,
      });
    }
  }

  /**
   * Get geographic distribution data
   * GET /api/analytics/connections/geographic
   */
  async getGeographicDistribution(req: Request, res: Response): Promise<void> {
    try {
      const analytics = await this.connectionsAnalyticsService.getConnectionsAnalytics();

      res.status(200).json({
        success: true,
        message: 'Geographic distribution retrieved successfully',
        data: {
          distribution: analytics.geographicDistribution,
          summary: {
            totalCountries: analytics.geographicDistribution.length,
            topCountry: analytics.geographicDistribution[0]?.country || 'N/A',
            totalMembers: analytics.overview.totalMembers
          }
        },
      });
    } catch (error) {
      console.error('Error fetching geographic distribution:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve geographic distribution',
        error: error.message,
      });
    }
  }

  /**
   * Get organization analytics
   * GET /api/analytics/connections/organizations
   */
  async getOrganizationAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const analytics = await this.connectionsAnalyticsService.getConnectionsAnalytics();

      res.status(200).json({
        success: true,
        message: 'Organization analytics retrieved successfully',
        data: {
          organizationTypes: analytics.organizationTypes,
          topOrganizations: analytics.topOrganizations,
          summary: {
            totalOrganizations: analytics.overview.totalOrganizations,
            averageMembers: analytics.organizationTypes.reduce((sum, org) => sum + org.averageMembers, 0) / analytics.organizationTypes.length || 0
          }
        },
      });
    } catch (error) {
      console.error('Error fetching organization analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve organization analytics',
        error: error.message,
      });
    }
  }

  /**
   * Get engagement analytics
   * GET /api/analytics/connections/engagement
   */
  async getEngagementAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const analytics = await this.connectionsAnalyticsService.getConnectionsAnalytics();

      res.status(200).json({
        success: true,
        message: 'Engagement analytics retrieved successfully',
        data: {
          activeConnections: analytics.activeConnections,
          membershipTiers: analytics.membershipTiers,
          networkGrowth: analytics.networkGrowth
        },
      });
    } catch (error) {
      console.error('Error fetching engagement analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve engagement analytics',
        error: error.message,
      });
    }
  }

  /**
   * Export connections analytics data
   * GET /api/analytics/connections/export
   */
  async exportConnectionsData(req: Request, res: Response): Promise<void> {
    try {
      const format = req.query.format as string || 'json';
      const analytics = await this.connectionsAnalyticsService.getConnectionsAnalytics();

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `connections-analytics-${timestamp}`;

      if (format === 'csv') {
        // Convert to CSV format
        const csvData = this.convertToCSV(analytics);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        res.send(csvData);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
        
        res.status(200).json({
          success: true,
          message: 'Analytics data exported successfully',
          exportedAt: new Date().toISOString(),
          data: analytics
        });
      }
    } catch (error) {
      console.error('Error exporting connections data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export connections data',
        error: error.message,
      });
    }
  }

  /**
   * Health check for connections analytics
   * GET /api/analytics/connections/health
   */
  async getHealthStatus(req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        message: 'Connections analytics service is healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    } catch (error) {
      console.error('Error in health check:', error);
      res.status(500).json({
        success: false,
        message: 'Health check failed',
        error: error.message,
      });
    }
  }

  /**
   * Convert analytics data to CSV format
   */
  private convertToCSV(data: any): string {
    const headers = ['Metric', 'Value', 'Category', 'Period'];
    
    const rows = [
      ['Total Members', data.overview.totalMembers, 'Overview', 'Current'],
      ['Total Organizations', data.overview.totalOrganizations, 'Overview', 'Current'],
      ['Total Connections', data.overview.totalConnections, 'Overview', 'Current'],
      ['Active This Month', data.overview.activeThisMonth, 'Overview', 'Monthly'],
      ['Growth Rate %', data.overview.growthRate, 'Overview', 'Monthly'],
      ['Network Density %', data.overview.networkDensity, 'Overview', 'Current'],
    ];

    // Add membership trends
    data.membershipTrends?.forEach((trend: any) => {
      rows.push([
        'New Members',
        trend.newMembers,
        'Membership Trends',
        trend.month
      ]);
    });

    // Add geographic data
    data.geographicDistribution?.forEach((geo: any) => {
      rows.push([
        `Members in ${geo.country}`,
        geo.memberCount,
        'Geographic',
        'Current'
      ]);
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }
}