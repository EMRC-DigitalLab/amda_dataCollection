import { Router } from 'express';
import { DataSource } from 'typeorm';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { adminMiddleware } from '../../../shared/middleware/admin.middleware';
import { ConnectionsAnalyticsController } from '../controllers/connections.controller';

export function createConnectionsRoutes(dataSource: DataSource): Router {
  const router = Router();
  const connectionsAnalyticsController = new ConnectionsAnalyticsController();

  // Apply authentication middleware to all routes
  router.use(authMiddleware);

  /**
   * @route   GET /api/analytics/connections/overview
   * @desc    Get comprehensive connections analytics data
   * @query   dateFrom (optional) - Start date filter
   * @query   dateTo (optional) - End date filter  
   * @query   country (optional) - Country filter
   * @query   organizationType (optional) - Organization type filter
   * @query   membershipTier (optional) - Membership tier filter
   * @query   includeInactive (optional) - Include inactive members
   * @access  Authenticated users (Admin only)
   */
  router.get(
    '/overview',
    adminMiddleware,
    connectionsAnalyticsController.getConnectionsOverview.bind(connectionsAnalyticsController)
  );

  /**
   * @route   GET /api/analytics/connections/trends
   * @desc    Get membership growth trends data
   * @access  Authenticated users (Admin only)
   */
  router.get(
    '/trends',
    adminMiddleware,
    connectionsAnalyticsController.getMembershipTrends.bind(connectionsAnalyticsController)
  );

  /**
   * @route   GET /api/analytics/connections/geographic
   * @desc    Get member and organization distribution by country
   * @access  Authenticated users (Admin only)
   */
  router.get(
    '/geographic',
    adminMiddleware,
    connectionsAnalyticsController.getGeographicDistribution.bind(connectionsAnalyticsController)
  );

  /**
   * @route   GET /api/analytics/connections/organizations
   * @desc    Get organization types and top performers analytics
   * @access  Authenticated users (Admin only)
   */
  router.get(
    '/organizations',
    adminMiddleware,
    connectionsAnalyticsController.getOrganizationAnalytics.bind(connectionsAnalyticsController)
  );

  /**
   * @route   GET /api/analytics/connections/engagement
   * @desc    Get member engagement and activity analytics
   * @access  Authenticated users (Admin only)
   */
  router.get(
    '/engagement',
    adminMiddleware,
    connectionsAnalyticsController.getEngagementAnalytics.bind(connectionsAnalyticsController)
  );

  /**
   * @route   GET /api/analytics/connections/export
   * @desc    Export connections analytics data
   * @query   format (optional) - Export format (csv or json)
   * @access  Authenticated users (Admin only)
   */
  router.get(
    '/export',
    adminMiddleware,
    connectionsAnalyticsController.exportConnectionsData.bind(connectionsAnalyticsController)
  );

  /**
   * @route   GET /api/analytics/connections/health
   * @desc    Health check for connections analytics service
   * @access  Authenticated users
   */
  router.get(
    '/health',
    connectionsAnalyticsController.getHealthStatus.bind(connectionsAnalyticsController)
  );

  return router;
}