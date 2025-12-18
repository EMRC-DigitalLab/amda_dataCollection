// @ts-nocheck
import { DataSource, Repository } from 'typeorm';
import { Member } from '../../../database/entities/member.entity';
import { MinigridSite } from '../../../database/entities/minigrid-site.entity';
import { User } from '../../../database/entities/user.entity';

export interface ConnectionsOverview {
  totalMembers: number;
  totalSites: number;
  totalConnections: number;
  activeThisMonth: number;
  newMembersThisMonth: number;
  growthRate: number;
  averageConnectionsPerMember: number;
  networkDensity: number;
}

export interface MembershipTrendData {
  month: string;
  newMembers: number;
  totalMembers: number;
  churnedMembers: number;
  netGrowth: number;
}

export interface GeographicData {
  country: string;
  memberCount: number;
  siteCount: number;
  percentage: number;
  growthRate: number;
}

export interface MembershipTierData {
  tier: string;
  count: number;
  percentage: number;
  revenue: number;
  retention: number;
}

export interface NetworkGrowthData {
  period: string;
  connections: number;
  strength: number;
  density: number;
}

export interface ActiveConnectionData {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  averageSessionDuration: number;
  topEngagementActivities: EngagementActivity[];
}

export interface EngagementActivity {
  activity: string;
  count: number;
  uniqueUsers: number;
  averageTime: number;
}

export interface TopMemberData {
  id: string;
  companyName: string;
  memberCount: number;
  totalSites: number;
  completionRate: number;
  revenue: number;
  joinedDate: string;
}

export interface ConnectionsAnalyticsData {
  overview: ConnectionsOverview;
  membershipTrends: MembershipTrendData[];
  geographicDistribution: GeographicData[];
  membershipTiers: MembershipTierData[];
  networkGrowth: NetworkGrowthData[];
  activeConnections: ActiveConnectionData;
  topMembers: TopMemberData[];
}

export class ConnectionsAnalyticsService {
  private memberRepository: Repository<Member>;
  private userRepository: Repository<User>;
  private siteRepository: Repository<MinigridSite>;

  constructor(dataSource: DataSource) {
    this.memberRepository = dataSource.getRepository(Member);
    this.userRepository = dataSource.getRepository(User);
    this.siteRepository = dataSource.getRepository(MinigridSite);
  }

  async getConnectionsAnalytics(filters: any = {}): Promise<ConnectionsAnalyticsData> {
    const [
      overview,
      membershipTrends,
      geographicDistribution,
      membershipTiers,
      networkGrowth,
      activeConnections,
      topMembers,
    ] = await Promise.all([
      this.getOverview(),
      this.getMembershipTrends(),
      this.getGeographicDistribution(),
      this.getMembershipTiers(),
      this.getNetworkGrowth(),
      this.getActiveConnections(),
      this.getTopMembers(),
    ]);

    return {
      overview,
      membershipTrends,
      geographicDistribution,
      membershipTiers,
      networkGrowth,
      activeConnections,
      topMembers,
    };
  }

  private async getOverview(): Promise<ConnectionsOverview> {
    const totalMembers = await this.memberRepository
      .createQueryBuilder('member')
      .where('member.membershipStatus = :status', { status: 'ACTIVE' })
      .getCount();

    const totalSites = await this.siteRepository.createQueryBuilder('site').getCount();

    // Calculate total connections from minigrid sites
    const connectionsResult = await this.siteRepository
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
      .where('site.status != :status', { status: 'Decommissioned' })
      .getRawOne();

    const totalConnections = parseInt(connectionsResult?.totalConnections) || 0;

    // Active members this month (those with recent activity)
    const thisMonth = new Date();
    thisMonth.setDate(1);

    const activeThisMonth = await this.memberRepository
      .createQueryBuilder('member')
      .where('member.membershipStatus = :status', { status: 'ACTIVE' })
      .andWhere('member.lastLoginAt >= :thisMonth', { thisMonth })
      .getCount();

    // New members this month
    const newMembersThisMonth = await this.memberRepository
      .createQueryBuilder('member')
      .where('member.createdAt >= :thisMonth', { thisMonth })
      .getCount();

    // Growth rate calculation
    const lastMonth = new Date(thisMonth);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const membersLastMonth = await this.memberRepository
      .createQueryBuilder('member')
      .where('member.createdAt < :thisMonth', { thisMonth })
      .getCount();

    const growthRate =
      membersLastMonth > 0 ? ((totalMembers - membersLastMonth) / membersLastMonth) * 100 : 0;

    return {
      totalMembers,
      totalSites,
      totalConnections,
      activeThisMonth,
      newMembersThisMonth,
      growthRate: Number(growthRate.toFixed(2)),
      averageConnectionsPerMember:
        totalMembers > 0 ? Number((totalConnections / totalMembers).toFixed(2)) : 0,
      networkDensity: Number(
        ((totalConnections / (totalMembers * totalSites || 1)) * 100).toFixed(2)
      ),
    };
  }

  private async getMembershipTrends(): Promise<MembershipTrendData[]> {
    const trends: MembershipTrendData[] = [];
    const months = 12;

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const newMembers = await this.memberRepository
        .createQueryBuilder('member')
        .where('member.createdAt BETWEEN :start AND :end', {
          start: startOfMonth,
          end: endOfMonth,
        })
        .getCount();

      const totalMembers = await this.memberRepository
        .createQueryBuilder('member')
        .where('member.createdAt <= :end', { end: endOfMonth })
        .getCount();

      const churnedMembers = await this.memberRepository
        .createQueryBuilder('member')
        .where('member.membershipStatus = :status', { status: 'INACTIVE' })
        .andWhere('member.updatedAt BETWEEN :start AND :end', {
          start: startOfMonth,
          end: endOfMonth,
        })
        .getCount();

      trends.push({
        month: startOfMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        newMembers,
        totalMembers,
        churnedMembers,
        netGrowth: newMembers - churnedMembers,
      });
    }

    return trends;
  }

  private async getGeographicDistribution(): Promise<GeographicData[]> {
    // Get geographic distribution from member countries
    const memberResult = await this.memberRepository
      .createQueryBuilder('member')
      .select('member.country', 'country')
      .addSelect('COUNT(member.id)', 'memberCount')
      .where('member.membershipStatus = :status', { status: 'ACTIVE' })
      .andWhere('member.country IS NOT NULL')
      .andWhere('member.country != :empty', { empty: '' })
      .groupBy('member.country')
      .orderBy('"memberCount"', 'DESC')
      .getRawMany();

    // Get site distribution by country
    const siteResult = await this.siteRepository
      .createQueryBuilder('site')
      .select('site.country', 'country')
      .addSelect('COUNT(site.id)', 'siteCount')
      .where('site.country IS NOT NULL')
      .andWhere('site.country != :empty', { empty: '' })
      .groupBy('site.country')
      .getRawMany();

    // Combine member and site data
    const countryMap = new Map();

    // Add member data
    memberResult.forEach(item => {
      countryMap.set(item.country, {
        country: item.country,
        memberCount: parseInt(item.memberCount),
        siteCount: 0,
      });
    });

    // Add site data
    siteResult.forEach(item => {
      const existing = countryMap.get(item.country) || {
        country: item.country,
        memberCount: 0,
        siteCount: 0,
      };
      existing.siteCount = parseInt(item.siteCount);
      countryMap.set(item.country, existing);
    });

    const result = Array.from(countryMap.values());
    const totalMembers = result.reduce((sum, item) => sum + item.memberCount, 0);

    return result.map(item => ({
      country: item.country,
      memberCount: item.memberCount,
      siteCount: item.siteCount,
      percentage:
        totalMembers > 0 ? Number(((item.memberCount / totalMembers) * 100).toFixed(2)) : 0,
      growthRate: Math.floor(Math.random() * 20) - 5, // Mock growth rate
    }));
  }

  private async getMembershipTiers(): Promise<MembershipTierData[]> {
    const result = await this.memberRepository
      .createQueryBuilder('member')
      .select('member.membershipType', 'tier')
      .addSelect('COUNT(member.id)', 'count')
      .where('member.membershipStatus = :status', { status: 'ACTIVE' })
      .andWhere('member.membershipType IS NOT NULL')
      .groupBy('member.membershipType')
      .orderBy('"count"', 'DESC')
      .getRawMany();

    const totalMembers = result.reduce((sum, item) => sum + parseInt(item.count), 0);

    const tierRevenue = { FULL: 1000, ASSOCIATE: 500, STUDENT_MEMBER: 250, CORPORATE_MEMBER: 1500 };
    const tierRetention = { FULL: 95, ASSOCIATE: 88, STUDENT_MEMBER: 75, CORPORATE_MEMBER: 97 };

    return result.map(item => ({
      tier: item.tier,
      count: parseInt(item.count),
      percentage: Number(((parseInt(item.count) / totalMembers) * 100).toFixed(2)),
      revenue: (tierRevenue[item.tier] || 300) * parseInt(item.count),
      retention: tierRetention[item.tier] || 80,
    }));
  }

  private async getNetworkGrowth(): Promise<NetworkGrowthData[]> {
    const periods = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const period = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      periods.push({
        period,
        connections: Math.floor(Math.random() * 100) + 50 + (11 - i) * 5,
        strength: Math.floor(Math.random() * 30) + 70,
        density: Math.floor(Math.random() * 20) + 40,
      });
    }

    return periods;
  }

  private async getActiveConnections(): Promise<ActiveConnectionData> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const dailyActiveUsers = await this.userRepository
      .createQueryBuilder('user')
      .where('user.lastLoginAt >= :date', { date: oneDayAgo })
      .getCount();

    const weeklyActiveUsers = await this.userRepository
      .createQueryBuilder('user')
      .where('user.lastLoginAt >= :date', { date: oneWeekAgo })
      .getCount();

    const monthlyActiveUsers = await this.userRepository
      .createQueryBuilder('user')
      .where('user.lastLoginAt >= :date', { date: oneMonthAgo })
      .getCount();

    const topEngagementActivities: EngagementActivity[] = [
      { activity: 'Form Submissions', count: 1250, uniqueUsers: 340, averageTime: 25 },
      { activity: 'Site Management', count: 890, uniqueUsers: 220, averageTime: 15 },
      { activity: 'Data Export', count: 450, uniqueUsers: 180, averageTime: 8 },
      { activity: 'Certificate Downloads', count: 320, uniqueUsers: 150, averageTime: 3 },
    ];

    return {
      dailyActiveUsers,
      weeklyActiveUsers,
      monthlyActiveUsers,
      averageSessionDuration: 42,
      topEngagementActivities,
    };
  }

  private async getTopMembers(): Promise<TopMemberData[]> {
    const result = await this.memberRepository
      .createQueryBuilder('member')
      .leftJoin('member.sites', 'sites')
      .select('member.id', 'id')
      .addSelect('member.companyName', 'companyName')
      .addSelect('COUNT(DISTINCT sites.id)', 'totalSites')
      .addSelect('member.createdAt', 'joinedDate')
      .where('member.membershipStatus = :status', { status: 'ACTIVE' })
      .groupBy('member.id, member.companyName, member.createdAt')
      .orderBy('"totalSites"', 'DESC')
      .limit(10)
      .getRawMany();

    return result.map(item => ({
      id: item.id,
      companyName: item.companyName || 'Unknown Company',
      memberCount: 1, // Each record represents one member
      totalSites: parseInt(item.totalSites) || 0,
      completionRate: Math.floor(Math.random() * 40) + 60,
      revenue: Math.floor(Math.random() * 50000) + 10000,
      joinedDate: new Date(item.joinedDate).toISOString(),
    }));
  }
}
