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
  }>;
}

export interface SitesByCountryAnalytics {
  totalSites: number;
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
