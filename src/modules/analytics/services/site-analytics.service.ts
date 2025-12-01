// @ts-nocheck
import { DataSource, Repository } from 'typeorm';
import { MinigridSite } from '../../../database/entities/minigrid-site.entity';
import {
  AverageConnectionsAnalytics,
  ConnectionsAnalytics,
  NewSitesCommissionedAnalytics,
  SitesByCountryAnalytics,
} from '../interfaces/sites.interface';

export class SitesAnalyticsService {
  private minigridSiteRepository: Repository<MinigridSite>;

  constructor(dataSource: DataSource) {
    this.minigridSiteRepository = dataSource.getRepository(MinigridSite);
  }

  /**
   * Get total connections reported by AMDA members with growth metrics
   */
  async getConnectionsAnalytics(): Promise<ConnectionsAnalytics> {
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;

    // Get total connections for current year - using regex to validate numeric strings
    const currentYearResult = await this.minigridSiteRepository
      .createQueryBuilder('site')
      .select(
        `SUM(
          CASE 
            WHEN site.connectedCustomers ~ '^[0-9]+$' 
            THEN CAST(site.connectedCustomers AS INTEGER)
            ELSE 0
          END
        )`,
        'totalConnections'
      )
      .where('EXTRACT(YEAR FROM site.commissioningDate) <= :currentYear', { currentYear })
      .andWhere('site.status != :status', { status: 'Decommissioned' })
      .getRawOne();

    // Get total connections for previous year
    const previousYearResult = await this.minigridSiteRepository
      .createQueryBuilder('site')
      .select(
        `SUM(
          CASE 
            WHEN site.connectedCustomers ~ '^[0-9]+$' 
            THEN CAST(site.connectedCustomers AS INTEGER)
            ELSE 0
          END
        )`,
        'totalConnections'
      )
      .where('EXTRACT(YEAR FROM site.commissioningDate) <= :previousYear', { previousYear })
      .andWhere('site.status != :status', { status: 'Decommissioned' })
      .getRawOne();

    const currentTotal = parseInt(currentYearResult?.totalConnections) || 0;
    const previousTotal = parseInt(previousYearResult?.totalConnections) || 0;

    const growthPercentage =
      previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

    // Get cumulative trend data
    const trendData = await this.minigridSiteRepository
      .createQueryBuilder('site')
      .select([
        'EXTRACT(YEAR FROM site.commissioningDate) as year',
        `SUM(
          CASE 
            WHEN site.connectedCustomers ~ '^[0-9]+$' 
            THEN CAST(site.connectedCustomers AS INTEGER)
            ELSE 0
          END
        ) as yearConnections`,
      ])
      .where('site.status != :status', { status: 'Decommissioned' })
      .andWhere('site.commissioningDate IS NOT NULL')
      .groupBy('EXTRACT(YEAR FROM site.commissioningDate)')
      .orderBy('year', 'ASC')
      .getRawMany();

    // Calculate cumulative trend
    let cumulativeTotal = 0;
    const cumulativeTrend = trendData.map(item => {
      const yearConnections = parseInt(item.yearConnections) || 0;
      cumulativeTotal += yearConnections;
      return {
        year: parseInt(item.year),
        totalConnections: cumulativeTotal,
        newConnections: yearConnections,
      };
    });

    return {
      totalConnections: currentTotal,
      growthPercentage: Math.round(growthPercentage * 100) / 100,
      latestYear: currentYear,
      cumulativeTrend,
    };
  }

  /**
   * Get average connections per minigrid site with trend
   */
  async getAverageConnectionsAnalytics(): Promise<AverageConnectionsAnalytics> {
    // Get trend data by year
    const trendData = await this.minigridSiteRepository
      .createQueryBuilder('site')
      .select([
        'EXTRACT(YEAR FROM site.commissioningDate) as year',
        `AVG(
          CASE 
            WHEN site.connectedCustomers ~ '^[0-9]+$' 
            AND CAST(site.connectedCustomers AS INTEGER) > 0
            THEN CAST(site.connectedCustomers AS INTEGER)
            ELSE NULL
          END
        ) as averageConnections`,
        `COUNT(
          CASE 
            WHEN site.connectedCustomers ~ '^[0-9]+$' 
            AND CAST(site.connectedCustomers AS INTEGER) > 0
            THEN 1
          END
        ) as siteCount`,
      ])
      .where('site.status != :status', { status: 'Decommissioned' })
      .andWhere('site.commissioningDate IS NOT NULL')
      .groupBy('EXTRACT(YEAR FROM site.commissioningDate)')
      .orderBy('year', 'ASC')
      .getRawMany();

    const trend = trendData.map(item => ({
      year: parseInt(item.year),
      averageConnections: Math.round(parseFloat(item.averageConnections) || 0),
      siteCount: parseInt(item.siteCount) || 0,
    }));

    // Get current average
    const currentAverageResult = await this.minigridSiteRepository
      .createQueryBuilder('site')
      .select(
        `AVG(
          CASE 
            WHEN site.connectedCustomers ~ '^[0-9]+$' 
            AND CAST(site.connectedCustomers AS INTEGER) > 0
            THEN CAST(site.connectedCustomers AS INTEGER)
            ELSE NULL
          END
        )`,
        'averageConnections'
      )
      .where('site.status != :status', { status: 'Decommissioned' })
      .getRawOne();

    const currentAverage = Math.round(parseFloat(currentAverageResult?.averageConnections) || 0);

    return {
      currentAverage,
      trend,
    };
  }

  /**
   * Get new minigrid sites added by country
   */
  async getSitesByCountryAnalytics(
    startYear?: number,
    endYear?: number
  ): Promise<SitesByCountryAnalytics> {
    const currentYear = new Date().getFullYear();
    const defaultStartYear = startYear || currentYear - 2;
    const defaultEndYear = endYear || currentYear;

    // Get sites by country with yearly breakdown
    const sitesData = await this.minigridSiteRepository
      .createQueryBuilder('site')
      .select([
        'site.country as country',
        'EXTRACT(YEAR FROM site.commissioningDate) as year',
        'COUNT(*) as count',
      ])
      .where('site.commissioningDate IS NOT NULL')
      .andWhere('EXTRACT(YEAR FROM site.commissioningDate) BETWEEN :startYear AND :endYear', {
        startYear: defaultStartYear,
        endYear: defaultEndYear,
      })
      .groupBy('site.country, EXTRACT(YEAR FROM site.commissioningDate)')
      .orderBy('site.country, year')
      .getRawMany();

    // Process data to group by country
    const countryMap = new Map();
    let totalSites = 0;

    sitesData.forEach(item => {
      const country = item.country || 'Unknown';
      const year = parseInt(item.year);
      const count = parseInt(item.count);
      totalSites += count;

      if (!countryMap.has(country)) {
        countryMap.set(country, {
          country,
          totalSites: 0,
          yearlyBreakdown: [],
        });
      }

      const countryData = countryMap.get(country);
      countryData.totalSites += count;
      countryData.yearlyBreakdown.push({ year, count });
    });

    const breakdown = Array.from(countryMap.values()).sort((a, b) => b.totalSites - a.totalSites);

    return {
      totalSites,
      breakdown,
      period: `${defaultStartYear}-${defaultEndYear}`,
    };
  }

  /**
   * Get new sites commissioned between specific years
   */
  async getNewSitesCommissionedAnalytics(
    startYear: number,
    endYear: number
  ): Promise<NewSitesCommissionedAnalytics> {
    // Get total count and breakdown by country
    const sitesData = await this.minigridSiteRepository
      .createQueryBuilder('site')
      .select(['site.country as country', 'COUNT(*) as count'])
      .where('site.commissioningDate IS NOT NULL')
      .andWhere('EXTRACT(YEAR FROM site.commissioningDate) BETWEEN :startYear AND :endYear', {
        startYear,
        endYear,
      })
      .groupBy('site.country')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany();

    const totalNewSites = sitesData.reduce((sum, item) => sum + parseInt(item.count), 0);

    const breakdown = sitesData.map(item => {
      const count = parseInt(item.count);
      return {
        country: item.country || 'Unknown',
        count,
        percentage: totalNewSites > 0 ? Math.round((count / totalNewSites) * 100 * 100) / 100 : 0,
      };
    });

    return {
      totalNewSites,
      period: `${startYear}-${endYear}`,
      breakdown,
    };
  }

  /**
   * Get comprehensive sites analytics dashboard data
   */
  async getSitesAnalyticsDashboard(startYear?: number, endYear?: number) {
    const currentYear = new Date().getFullYear();
    const defaultStartYear = startYear || currentYear - 2;
    const defaultEndYear = endYear || currentYear;

    const [
      connectionsAnalytics,
      averageConnectionsAnalytics,
      sitesByCountryAnalytics,
      newSitesCommissionedAnalytics,
    ] = await Promise.all([
      this.getConnectionsAnalytics(),
      this.getAverageConnectionsAnalytics(),
      this.getSitesByCountryAnalytics(defaultStartYear, defaultEndYear),
      this.getNewSitesCommissionedAnalytics(defaultStartYear, defaultEndYear),
    ]);

    return {
      connections: connectionsAnalytics,
      averageConnections: averageConnectionsAnalytics,
      sitesByCountry: sitesByCountryAnalytics,
      newSitesCommissioned: newSitesCommissionedAnalytics,
      metadata: {
        generatedAt: new Date(),
        period: `${defaultStartYear}-${defaultEndYear}`,
      },
    };
  }

  /**
   * Get site status distribution
   */
  async getSiteStatusDistribution() {
    const statusData = await this.minigridSiteRepository
      .createQueryBuilder('site')
      .select(['site.status as status', 'COUNT(*) as count'])
      .groupBy('site.status')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany();

    const totalSites = statusData.reduce((sum, item) => sum + parseInt(item.count), 0);

    return statusData.map(item => ({
      status: item.status || 'Unknown',
      count: parseInt(item.count),
      percentage:
        totalSites > 0 ? Math.round((parseInt(item.count) / totalSites) * 100 * 100) / 100 : 0,
    }));
  }

  /**
   * Get capacity analytics
   */
  async getCapacityAnalytics() {
    // Get all sites count first
    const totalSitesCount = await this.minigridSiteRepository
      .createQueryBuilder('site')
      .where('site.status != :status', { status: 'Decommissioned' })
      .getCount();

    // Get capacity data with proper null handling and regex validation
    const capacityData = await this.minigridSiteRepository
      .createQueryBuilder('site')
      .select([
        `SUM(
          CASE 
            WHEN site.installedCapacityKw ~ '^[0-9]+(\\.[0-9]+)?$' 
            THEN CAST(site.installedCapacityKw AS DECIMAL)
            ELSE 0
          END
        ) as totalCapacity`,
        `AVG(
          CASE 
            WHEN site.installedCapacityKw ~ '^[0-9]+(\\.[0-9]+)?$' 
            AND CAST(site.installedCapacityKw AS DECIMAL) > 0
            THEN CAST(site.installedCapacityKw AS DECIMAL)
            ELSE NULL
          END
        ) as averageCapacity`,
        `MAX(
          CASE 
            WHEN site.installedCapacityKw ~ '^[0-9]+(\\.[0-9]+)?$' 
            THEN CAST(site.installedCapacityKw AS DECIMAL)
            ELSE 0
          END
        ) as maxCapacity`,
        `COUNT(
          CASE 
            WHEN site.installedCapacityKw ~ '^[0-9]+(\\.[0-9]+)?$' 
            AND CAST(site.installedCapacityKw AS DECIMAL) > 0
            THEN 1
          END
        ) as sitesWithCapacity`,
      ])
      .where('site.status != :status', { status: 'Decommissioned' })
      .getRawOne();

    return {
      totalCapacityKw: Math.round((parseFloat(capacityData?.totalCapacity) || 0) * 100) / 100,
      averageCapacityKw: Math.round((parseFloat(capacityData?.averageCapacity) || 0) * 100) / 100,
      maxCapacityKw: Math.round((parseFloat(capacityData?.maxCapacity) || 0) * 100) / 100,
      totalSites: totalSitesCount,
      sitesWithCapacity: parseInt(capacityData?.sitesWithCapacity) || 0,
    };
  }
}
