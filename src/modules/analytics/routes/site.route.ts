import { Router } from 'express';
import { DataSource } from 'typeorm';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { SitesAnalyticsController } from '../controllers/sites.controller';

export function createSiteRoutes(dataSource: DataSource): Router {
  const router = Router();
  const sitesAnalyticsController = new SitesAnalyticsController();

  // Apply authentication middleware to all routes
  router.use(authMiddleware);

  /**
   * @route   GET /api/analytics/sites/connections
   * @desc    Get total connections analytics with growth metrics
   * @access  Authenticated users
   */
  router.get(
    '/connections',
    sitesAnalyticsController.getConnectionsAnalytics.bind(sitesAnalyticsController)
  );

  /**
   * @route   GET /api/analytics/sites/average-connections
   * @desc    Get average connections per minigrid site with trend
   * @access  Authenticated users
   */
  router.get(
    '/average-connections',
    sitesAnalyticsController.getAverageConnectionsAnalytics.bind(sitesAnalyticsController)
  );

  /**
   * @route   GET /api/analytics/sites/by-country
   * @desc    Get new minigrid sites added by country
   * @query   startYear (optional) - Start year for filtering
   * @query   endYear (optional) - End year for filtering
   * @access  Authenticated users
   */
  router.get(
    '/by-country',
    sitesAnalyticsController.getSitesByCountryAnalytics.bind(sitesAnalyticsController)
  );

  /**
   * @route   GET /api/analytics/sites/new-commissioned
   * @desc    Get new sites commissioned between specific years
   * @query   startYear (required) - Start year for filtering
   * @query   endYear (required) - End year for filtering
   * @access  Authenticated users
   */
  router.get(
    '/new-commissioned',
    sitesAnalyticsController.getNewSitesCommissionedAnalytics.bind(sitesAnalyticsController)
  );

  /**
   * @route   GET /api/analytics/sites/dashboard
   * @desc    Get comprehensive sites analytics dashboard
   * @query   startYear (optional) - Start year for filtering
   * @query   endYear (optional) - End year for filtering
   * @access  Authenticated users
   */
  router.get(
    '/dashboard',
    sitesAnalyticsController.getSitesAnalyticsDashboard.bind(sitesAnalyticsController)
  );

  /**
   * @route   GET /api/analytics/sites/status-distribution
   * @desc    Get distribution of sites by status
   * @access  Authenticated users
   */
  router.get(
    '/status-distribution',
    sitesAnalyticsController.getSiteStatusDistribution.bind(sitesAnalyticsController)
  );

  /**
   * @route   GET /api/analytics/sites/capacity
   * @desc    Get capacity analytics (total, average, max capacity)
   * @access  Authenticated users
   */
  router.get(
    '/capacity',
    sitesAnalyticsController.getCapacityAnalytics.bind(sitesAnalyticsController)
  );

  /**
   * @route   GET /api/analytics/sites/summary
   * @desc    Get quick analytics summary for overview
   * @access  Authenticated users
   */
  router.get(
    '/summary',
    sitesAnalyticsController.getAnalyticsSummary.bind(sitesAnalyticsController)
  );

  // Admin-only routes (if you want to restrict certain analytics to admins)
  /**
   * @route   GET /api/analytics/sites/admin/detailed-dashboard
   * @desc    Get detailed analytics dashboard (admin only)
   * @access  Admin users only
   */
  router.get(
    '/admin/detailed-dashboard',
    sitesAnalyticsController.getSitesAnalyticsDashboard.bind(sitesAnalyticsController)
  );

  return router;
}
