import { Router } from 'express';
import { DataSource } from 'typeorm';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { adminMiddleware } from '../../../shared/middleware/admin.middleware';
import { FinanceAnalyticsController } from '../controllers/finance.controller';

export function createFinanceRoutes(dataSource: DataSource): Router {
  const router = Router();
  const financeAnalyticsController = new FinanceAnalyticsController();

  // Apply authentication middleware to all routes
  router.use(authMiddleware);

  /**
   * @route   GET /api/analytics/finance/overview
   * @desc    Get comprehensive finance analytics data
   * @query   dateFrom (optional) - Start date filter
   * @query   dateTo (optional) - End date filter
   * @query   country (optional) - Country filter
   * @query   membershipTier (optional) - Membership tier filter
   * @query   paymentStatus (optional) - Payment status filter
   * @access  Authenticated users (Admin only)
   */
  router.get(
    '/overview',
    adminMiddleware,
    financeAnalyticsController.getFinanceOverview.bind(financeAnalyticsController)
  );

  /**
   * @route   GET /api/analytics/finance/revenue-breakdown
   * @desc    Get revenue breakdown by category
   * @access  Authenticated users (Admin only)
   */
  router.get(
    '/revenue-breakdown',
    adminMiddleware,
    financeAnalyticsController.getRevenueBreakdown.bind(financeAnalyticsController)
  );

  /**
   * @route   GET /api/analytics/finance/payment-trends
   * @desc    Get payment trends over time
   * @access  Authenticated users (Admin only)
   */
  router.get(
    '/payment-trends',
    adminMiddleware,
    financeAnalyticsController.getPaymentTrends.bind(financeAnalyticsController)
  );

  /**
   * @route   GET /api/analytics/finance/membership-revenue
   * @desc    Get membership revenue by tier
   * @access  Authenticated users (Admin only)
   */
  router.get(
    '/membership-revenue',
    adminMiddleware,
    financeAnalyticsController.getMembershipRevenue.bind(financeAnalyticsController)
  );

  /**
   * @route   GET /api/analytics/finance/geographic-revenue
   * @desc    Get revenue distribution by country
   * @access  Authenticated users (Admin only)
   */
  router.get(
    '/geographic-revenue',
    adminMiddleware,
    financeAnalyticsController.getGeographicRevenue.bind(financeAnalyticsController)
  );

  /**
   * @route   GET /api/analytics/finance/outstanding-payments
   * @desc    Get outstanding payments data
   * @access  Authenticated users (Admin only)
   */
  router.get(
    '/outstanding-payments',
    adminMiddleware,
    financeAnalyticsController.getOutstandingPayments.bind(financeAnalyticsController)
  );

  /**
   * @route   GET /api/analytics/finance/forecast
   * @desc    Get revenue forecast data
   * @access  Authenticated users (Admin only)
   */
  router.get(
    '/forecast',
    adminMiddleware,
    financeAnalyticsController.getRevenueForecast.bind(financeAnalyticsController)
  );

  /**
   * @route   GET /api/analytics/finance/export
   * @desc    Export finance analytics data
   * @query   format (optional) - Export format (csv or json)
   * @access  Authenticated users (Admin only)
   */
  router.get(
    '/export',
    adminMiddleware,
    financeAnalyticsController.exportFinanceData.bind(financeAnalyticsController)
  );

  /**
   * @route   GET /api/analytics/finance/health
   * @desc    Health check for finance analytics service
   * @access  Authenticated users
   */
  router.get(
    '/health',
    financeAnalyticsController.getHealthStatus.bind(financeAnalyticsController)
  );

  return router;
}
