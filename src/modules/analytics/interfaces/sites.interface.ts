export interface ConnectionsAnalytics {
  totalConnections: number;
  growthPercentage: number;
  latestYear: number;
  cumulativeTrend: Array<{
    year: number;
    totalConnections: number;
    newConnections: number;
  }>;
}

export interface AverageConnectionsAnalytics {
  currentAverage: number;
  trend: Array<{
    year: number;
    averageConnections: number;
    siteCount: number;
  }>;
}

export interface SitesByCountryAnalytics {
  totalSites: number;
  period: string;
  breakdown: Array<{
    country: string;
    totalSites: number;
    yearlyBreakdown: Array<{
      year: number;
      count: number;
    }>;
  }>;
}

export interface NewSitesCommissionedAnalytics {
  totalNewSites: number;
  period: string;
  breakdown: Array<{
    country: string;
    count: number;
    percentage: number;
  }>;
}

export interface CapacityAnalytics {
  totalCapacityKw: number;
  averageCapacityKw: number;
  maxCapacityKw: number;
  totalSites: number;
  sitesWithCapacity: number;
}

export interface StatusDistributionAnalytics {
  status: string;
  count: number;
  percentage: number;
}

export interface SitesAnalyticsDashboard {
  connections: ConnectionsAnalytics;
  averageConnections: AverageConnectionsAnalytics;
  sitesByCountry: SitesByCountryAnalytics;
  newSitesCommissioned: NewSitesCommissionedAnalytics;
  metadata: {
    generatedAt: Date;
    period: string;
  };
}
