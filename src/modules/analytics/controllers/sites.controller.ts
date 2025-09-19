// @ts-nocheck

import { Request, Response } from 'express';
import { AppDataSource } from '../../../config/database';
import { ResponseHelper } from '../../../shared/utils/response';
import { SitesAnalyticsService } from '../services/site-analytics.service';

export class SitesAnalyticsController {
  private sitesAnalyticsService: SitesAnalyticsService;

  constructor() {
    this.sitesAnalyticsService = new SitesAnalyticsService(AppDataSource);
  }

  /**
   * Get connections analytics - total connections and growth
   * GET /api/analytics/sites/connections
   */
  async getConnectionsAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const analytics = await this.sitesAnalyticsService.getConnectionsAnalytics();

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
   * Get average connections per site analytics
   * GET /api/analytics/sites/average-connections
   */
  async getAverageConnectionsAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const analytics = await this.sitesAnalyticsService.getAverageConnectionsAnalytics();

      res.status(200).json({
        success: true,
        message: 'Average connections analytics retrieved successfully',
        data: analytics,
      });
    } catch (error) {
      console.error('Error fetching average connections analytics:', error);
      ResponseHelper.error(res, err.message, 400);
    }
  }

  /**
   * Get sites by country analytics
   * GET /api/analytics/sites/by-country
   * Query params: startYear, endYear
   */
  async getSitesByCountryAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { startYear, endYear } = req.query;

      const startYearNum = startYear ? parseInt(startYear as string) : undefined;
      const endYearNum = endYear ? parseInt(endYear as string) : undefined;

      // Validate years if provided
      if (startYear && isNaN(startYearNum!)) {
        res.status(400).json({
          success: false,
          message: 'Invalid startYear parameter',
        });
        return;
      }

      if (endYear && isNaN(endYearNum!)) {
        res.status(400).json({
          success: false,
          message: 'Invalid endYear parameter',
        });
        return;
      }

      if (startYearNum && endYearNum && startYearNum > endYearNum) {
        res.status(400).json({
          success: false,
          message: 'startYear cannot be greater than endYear',
        });
        return;
      }

      const analytics = await this.sitesAnalyticsService.getSitesByCountryAnalytics(
        startYearNum,
        endYearNum
      );

      res.status(200).json({
        success: true,
        message: 'Sites by country analytics retrieved successfully',
        data: analytics,
        params: {
          startYear: startYearNum,
          endYear: endYearNum,
        },
      });
    } catch (error) {
      console.error('Error fetching sites by country analytics:', error);
      ResponseHelper.error(res, err.message, 400);
    }
  }

  /**
   * Get new sites commissioned analytics
   * GET /api/analytics/sites/new-commissioned
   * Query params: startYear (required), endYear (required)
   */
  async getNewSitesCommissionedAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { startYear, endYear } = req.query;

      // Validate required parameters
      if (!startYear || !endYear) {
        res.status(400).json({
          success: false,
          message: 'Both startYear and endYear parameters are required',
        });
        return;
      }

      const startYearNum = parseInt(startYear as string);
      const endYearNum = parseInt(endYear as string);

      if (isNaN(startYearNum) || isNaN(endYearNum)) {
        res.status(400).json({
          success: false,
          message: 'startYear and endYear must be valid numbers',
        });
        return;
      }

      if (startYearNum > endYearNum) {
        res.status(400).json({
          success: false,
          message: 'startYear cannot be greater than endYear',
        });
        return;
      }

      const analytics = await this.sitesAnalyticsService.getNewSitesCommissionedAnalytics(
        startYearNum,
        endYearNum
      );

      res.status(200).json({
        success: true,
        message: 'New sites commissioned analytics retrieved successfully',
        data: analytics,
      });
    } catch (error) {
      console.error('Error fetching new sites commissioned analytics:', error);
      ResponseHelper.error(res, err.message, 400);
    }
  }

  /**
   * Get comprehensive sites analytics dashboard
   * GET /api/analytics/sites/dashboard
   * Query params: startYear, endYear
   */
  async getSitesAnalyticsDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { startYear, endYear } = req.query;

      const startYearNum = startYear ? parseInt(startYear as string) : undefined;
      const endYearNum = endYear ? parseInt(endYear as string) : undefined;

      // Validate years if provided
      if (startYear && isNaN(startYearNum!)) {
        res.status(400).json({
          success: false,
          message: 'Invalid startYear parameter',
        });
        return;
      }

      if (endYear && isNaN(endYearNum!)) {
        res.status(400).json({
          success: false,
          message: 'Invalid endYear parameter',
        });
        return;
      }

      if (startYearNum && endYearNum && startYearNum > endYearNum) {
        res.status(400).json({
          success: false,
          message: 'startYear cannot be greater than endYear',
        });
        return;
      }

      const dashboard = await this.sitesAnalyticsService.getSitesAnalyticsDashboard(
        startYearNum,
        endYearNum
      );

      res.status(200).json({
        success: true,
        message: 'Sites analytics dashboard retrieved successfully',
        data: dashboard,
      });
    } catch (error) {
      console.error('Error fetching sites analytics dashboard:', error);
      ResponseHelper.error(res, err.message, 400);
    }
  }

  /**
   * Get site status distribution
   * GET /api/analytics/sites/status-distribution
   */
  async getSiteStatusDistribution(req: Request, res: Response): Promise<void> {
    try {
      const analytics = await this.sitesAnalyticsService.getSiteStatusDistribution();

      res.status(200).json({
        success: true,
        message: 'Site status distribution retrieved successfully',
        data: analytics,
      });
    } catch (error) {
      console.error('Error fetching site status distribution:', error);
      ResponseHelper.error(res, err.message, 400);
    }
  }

  /**
   * Get capacity analytics
   * GET /api/analytics/sites/capacity
   */
  async getCapacityAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const analytics = await this.sitesAnalyticsService.getCapacityAnalytics();

      res.status(200).json({
        success: true,
        message: 'Capacity analytics retrieved successfully',
        data: analytics,
      });
    } catch (error) {
      console.error('Error fetching capacity analytics:', error);
      ResponseHelper.error(res, err.message, 400);
    }
  }

  /**
   * Get analytics summary for quick overview
   * GET /api/analytics/sites/summary
   */
  async getAnalyticsSummary(req: Request, res: Response): Promise<void> {
    try {
      const [
        connectionsAnalytics,
        averageConnectionsAnalytics,
        statusDistribution,
        capacityAnalytics,
      ] = await Promise.all([
        this.sitesAnalyticsService.getConnectionsAnalytics(),
        this.sitesAnalyticsService.getAverageConnectionsAnalytics(),
        this.sitesAnalyticsService.getSiteStatusDistribution(),
        this.sitesAnalyticsService.getCapacityAnalytics(),
      ]);

      const summary = {
        totalConnections: connectionsAnalytics.totalConnections,
        connectionsGrowth: connectionsAnalytics.growthPercentage,
        averageConnectionsPerSite: averageConnectionsAnalytics.currentAverage,
        totalCapacityKw: capacityAnalytics.totalCapacityKw,
        totalActiveSites: capacityAnalytics.totalSites,
        statusDistribution: statusDistribution.slice(0, 3), // Top 3 statuses
        generatedAt: new Date(),
      };

      res.status(200).json({
        success: true,
        message: 'Analytics summary retrieved successfully',
        data: summary,
      });
    } catch (error) {
      console.error('Error fetching analytics summary:', error);
      ResponseHelper.error(res, err.message, 400);
    }
  }
}
