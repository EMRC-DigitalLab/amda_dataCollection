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

    // Get total connections for current year
    const currentYearResult = await this.minigridSiteRepository
      .createQueryBuilder('site')
      .select('SUM(CAST(site.connectedCustomers AS INTEGER))', 'totalConnections')
      .where('EXTRACT(YEAR FROM site.commissioningDate) <= :currentYear', { currentYear })
      .andWhere('site.status != :status', { status: 'Decommissioned' })
      .getRawOne();

    // Get total connections for previous year
    const previousYearResult = await this.minigridSiteRepository
      .createQueryBuilder('site')
      .select('SUM(CAST(site.connectedCustomers AS INTEGER))', 'totalConnections')
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
        'SUM(CAST(site.connectedCustomers AS INTEGER)) as yearConnections',
      ])
      .where('site.status != :status', { status: 'Decommissioned' })
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
        'AVG(CAST(site.connectedCustomers AS INTEGER)) as averageConnections',
        'COUNT(*) as siteCount',
      ])
      .where('site.status != :status', { status: 'Decommissioned' })
      .andWhere('CAST(site.connectedCustomers AS INTEGER) > 0')
      .groupBy('EXTRACT(YEAR FROM site.commissioningDate)')
      .orderBy('year', 'ASC')
      .getRawMany();

    const trend = trendData.map(item => ({
      year: parseInt(item.year),
      averageConnections: Math.round(parseFloat(item.averageConnections) || 0),
    }));

    // Get current average
    const currentAverageResult = await this.minigridSiteRepository
      .createQueryBuilder('site')
      .select('AVG(CAST(site.connectedCustomers AS INTEGER))', 'averageConnections')
      .where('site.status != :status', { status: 'Decommissioned' })
      .andWhere('CAST(site.connectedCustomers AS INTEGER) > 0')
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
      .where('EXTRACT(YEAR FROM site.commissioningDate) BETWEEN :startYear AND :endYear', {
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
      const country = item.country;
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
      .where('EXTRACT(YEAR FROM site.commissioningDate) BETWEEN :startYear AND :endYear', {
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
        country: item.country,
        count,
        percentage: Math.round((count / totalNewSites) * 100 * 100) / 100,
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
    const [
      connectionsAnalytics,
      averageConnectionsAnalytics,
      sitesByCountryAnalytics,
      newSitesCommissionedAnalytics,
    ] = await Promise.all([
      this.getConnectionsAnalytics(),
      this.getAverageConnectionsAnalytics(),
      this.getSitesByCountryAnalytics(startYear, endYear),
      this.getNewSitesCommissionedAnalytics(startYear || 2022, endYear || 2024),
    ]);

    return {
      connections: connectionsAnalytics,
      averageConnections: averageConnectionsAnalytics,
      sitesByCountry: sitesByCountryAnalytics,
      newSitesCommissioned: newSitesCommissionedAnalytics,
      metadata: {
        generatedAt: new Date(),
        period: `${startYear || 2022}-${endYear || 2024}`,
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
      status: item.status,
      count: parseInt(item.count),
      percentage: Math.round((parseInt(item.count) / totalSites) * 100 * 100) / 100,
    }));
  }

  /**
   * Get capacity analytics
   */
  async getCapacityAnalytics() {
    const capacityData = await this.minigridSiteRepository
      .createQueryBuilder('site')
      .select([
        'SUM(CAST(site.installedCapacityKw AS DECIMAL)) as totalCapacity',
        'AVG(CAST(site.installedCapacityKw AS DECIMAL)) as averageCapacity',
        'MAX(CAST(site.installedCapacityKw AS DECIMAL)) as maxCapacity',
        'COUNT(*) as siteCount',
      ])
      .where('site.status != :status', { status: 'Decommissioned' })
      .andWhere('CAST(site.installedCapacityKw AS DECIMAL) > 0')
      .getRawOne();

    return {
      totalCapacityKw: parseFloat(capacityData?.totalCapacity) || 0,
      averageCapacityKw: Math.round(parseFloat(capacityData?.averageCapacity) || 0),
      maxCapacityKw: parseFloat(capacityData?.maxCapacity) || 0,
      totalSites: parseInt(capacityData?.siteCount) || 0,
    };
  }
}
