// @ts-nocheck
import { Request, Response } from 'express';
import { AppDataSource } from '../../../config/database';
import { FinanceAnalyticsService } from '../services/finance-analytics.service';

export class FinanceAnalyticsController {
  private financeAnalyticsService: FinanceAnalyticsService;

  constructor() {
    this.financeAnalyticsService = new FinanceAnalyticsService(AppDataSource);
  }

  /**
   * Get comprehensive finance analytics data
   * GET /api/analytics/finance/overview
   */
  async getFinanceOverview(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        country: req.query.country as string,
        membershipTier: req.query.membershipTier as string,
        paymentStatus: req.query.paymentStatus as string
      };

      const analytics = await this.financeAnalyticsService.getFinanceAnalytics(filters);

      res.status(200).json({
        success: true,
        message: 'Finance analytics retrieved successfully',
        data: analytics,
      });
    } catch (error) {
      console.error('Error fetching finance analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve finance analytics',
        error: error.message,
      });
    }
  }

  /**
   * Get revenue breakdown data
   * GET /api/analytics/finance/revenue-breakdown
   */
  async getRevenueBreakdown(req: Request, res: Response): Promise<void> {
    try {
      const analytics = await this.financeAnalyticsService.getFinanceAnalytics();

      res.status(200).json({
        success: true,
        message: 'Revenue breakdown retrieved successfully',
        data: {
          breakdown: analytics.revenueBreakdown,
          overview: {
            totalRevenue: analytics.overview.totalRevenue,
            monthlyRecurringRevenue: analytics.overview.monthlyRecurringRevenue,
            growthRate: analytics.overview.revenueGrowthRate
          }
        },
      });
    } catch (error) {
      console.error('Error fetching revenue breakdown:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve revenue breakdown',
        error: error.message,
      });
    }
  }

  /**
   * Get payment trends data
   * GET /api/analytics/finance/payment-trends
   */
  async getPaymentTrends(req: Request, res: Response): Promise<void> {
    try {
      const analytics = await this.financeAnalyticsService.getFinanceAnalytics();

      res.status(200).json({
        success: true,
        message: 'Payment trends retrieved successfully',
        data: {
          trends: analytics.paymentTrends,
          summary: {
            totalRevenue: analytics.overview.totalRevenue,
            pendingPayments: analytics.overview.totalPendingPayments,
            completionRate: analytics.overview.paymentCompletionRate
          }
        },
      });
    } catch (error) {
      console.error('Error fetching payment trends:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payment trends',
        error: error.message,
      });
    }
  }

  /**
   * Get membership revenue data
   * GET /api/analytics/finance/membership-revenue
   */
  async getMembershipRevenue(req: Request, res: Response): Promise<void> {
    try {
      const analytics = await this.financeAnalyticsService.getFinanceAnalytics();

      res.status(200).json({
        success: true,
        message: 'Membership revenue retrieved successfully',
        data: {
          membershipRevenue: analytics.membershipRevenue,
          summary: {
            totalMembershipFees: analytics.overview.totalMembershipFees,
            monthlyRecurringRevenue: analytics.overview.monthlyRecurringRevenue,
            averageRevenuePerMember: analytics.overview.averageRevenuePerMember
          }
        },
      });
    } catch (error) {
      console.error('Error fetching membership revenue:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve membership revenue',
        error: error.message,
      });
    }
  }

  /**
   * Get geographic revenue distribution
   * GET /api/analytics/finance/geographic-revenue
   */
  async getGeographicRevenue(req: Request, res: Response): Promise<void> {
    try {
      const analytics = await this.financeAnalyticsService.getFinanceAnalytics();

      res.status(200).json({
        success: true,
        message: 'Geographic revenue retrieved successfully',
        data: {
          geographicRevenue: analytics.geographicRevenue,
          summary: {
            totalCountries: analytics.geographicRevenue.length,
            topRevenueCountry: analytics.geographicRevenue[0]?.country || 'N/A',
            totalRevenue: analytics.overview.totalRevenue
          }
        },
      });
    } catch (error) {
      console.error('Error fetching geographic revenue:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve geographic revenue',
        error: error.message,
      });
    }
  }

  /**
   * Get outstanding payments data
   * GET /api/analytics/finance/outstanding-payments
   */
  async getOutstandingPayments(req: Request, res: Response): Promise<void> {
    try {
      const analytics = await this.financeAnalyticsService.getFinanceAnalytics();

      res.status(200).json({
        success: true,
        message: 'Outstanding payments retrieved successfully',
        data: {
          outstandingPayments: analytics.outstandingPayments,
          summary: {
            totalOutstanding: analytics.overview.totalPendingPayments,
            totalRecords: analytics.outstandingPayments.length,
            criticalCount: analytics.outstandingPayments.filter(p => p.status === 'Critical').length
          }
        },
      });
    } catch (error) {
      console.error('Error fetching outstanding payments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve outstanding payments',
        error: error.message,
      });
    }
  }

  /**
   * Get revenue forecast data
   * GET /api/analytics/finance/forecast
   */
  async getRevenueForecast(req: Request, res: Response): Promise<void> {
    try {
      const analytics = await this.financeAnalyticsService.getFinanceAnalytics();

      res.status(200).json({
        success: true,
        message: 'Revenue forecast retrieved successfully',
        data: {
          forecast: analytics.revenueForecast,
          summary: {
            totalProjectedRevenue: analytics.revenueForecast.reduce((sum, f) => sum + f.projectedRevenue, 0),
            averageConfidence: analytics.revenueForecast.reduce((sum, f) => sum + f.confidenceLevel, 0) / analytics.revenueForecast.length,
            forecastPeriod: `${analytics.revenueForecast.length} months`
          }
        },
      });
    } catch (error) {
      console.error('Error fetching revenue forecast:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve revenue forecast',
        error: error.message,
      });
    }
  }

  /**
   * Export finance analytics data
   * GET /api/analytics/finance/export
   */
  async exportFinanceData(req: Request, res: Response): Promise<void> {
    try {
      const format = req.query.format as string || 'json';
      const analytics = await this.financeAnalyticsService.getFinanceAnalytics();

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `finance-analytics-${timestamp}`;

      if (format === 'csv') {
        const csvData = this.convertToCSV(analytics);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        res.send(csvData);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
        
        res.status(200).json({
          success: true,
          message: 'Finance analytics data exported successfully',
          exportedAt: new Date().toISOString(),
          data: analytics
        });
      }
    } catch (error) {
      console.error('Error exporting finance data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export finance data',
        error: error.message,
      });
    }
  }

  /**
   * Health check for finance analytics
   * GET /api/analytics/finance/health
   */
  async getHealthStatus(req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        message: 'Finance analytics service is healthy',
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
      ['Total Revenue', data.overview.totalRevenue, 'Overview', 'Annual'],
      ['Monthly Recurring Revenue', data.overview.monthlyRecurringRevenue, 'Overview', 'Monthly'],
      ['Average Revenue Per Member', data.overview.averageRevenuePerMember, 'Overview', 'Current'],
      ['Pending Payments', data.overview.totalPendingPayments, 'Overview', 'Current'],
      ['Revenue Growth Rate %', data.overview.revenueGrowthRate, 'Overview', 'Annual'],
      ['Payment Completion Rate %', data.overview.paymentCompletionRate, 'Overview', 'Current'],
    ];

    // Add revenue breakdown
    data.revenueBreakdown?.forEach((item: any) => {
      rows.push([
        item.category,
        item.amount,
        'Revenue Breakdown',
        'Annual'
      ]);
    });

    // Add payment trends
    data.paymentTrends?.forEach((trend: any) => {
      rows.push([
        'Revenue',
        trend.revenue,
        'Payment Trends',
        trend.month
      ]);
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }
}