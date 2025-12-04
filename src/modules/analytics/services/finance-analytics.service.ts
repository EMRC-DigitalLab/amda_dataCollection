// @ts-nocheck
import { DataSource, Repository } from 'typeorm';
import { Member } from '../../../database/entities/member.entity';
import { MinigridSite } from '../../../database/entities/minigrid-site.entity';

export interface FinanceOverview {
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  averageRevenuePerMember: number;
  totalPendingPayments: number;
  revenueGrowthRate: number;
  paymentCompletionRate: number;
  totalMembershipFees: number;
  totalCertificationFees: number;
}

export interface RevenueBreakdownData {
  category: string;
  amount: number;
  percentage: number;
  growth: number;
}

export interface MembershipRevenueData {
  tier: string;
  memberCount: number;
  monthlyFee: number;
  totalMonthlyRevenue: number;
  annualRevenue: number;
  retention: number;
}

export interface PaymentTrendData {
  month: string;
  revenue: number;
  membershipFees: number;
  certificationFees: number;
  otherFees: number;
  pendingPayments: number;
}

export interface GeographicRevenueData {
  country: string;
  revenue: number;
  memberCount: number;
  averageRevenuePerMember: number;
  percentage: number;
}

export interface OutstandingPaymentsData {
  memberName: string;
  companyName: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
  paymentType: string;
  status: string;
}

export interface RevenueForecastData {
  month: string;
  projectedRevenue: number;
  confirmedRevenue: number;
  potentialRevenue: number;
  confidenceLevel: number;
}

export interface FinanceAnalyticsData {
  overview: FinanceOverview;
  revenueBreakdown: RevenueBreakdownData[];
  membershipRevenue: MembershipRevenueData[];
  paymentTrends: PaymentTrendData[];
  geographicRevenue: GeographicRevenueData[];
  outstandingPayments: OutstandingPaymentsData[];
  revenueForecast: RevenueForecastData[];
}

export class FinanceAnalyticsService {
  private memberRepository: Repository<Member>;
  private siteRepository: Repository<MinigridSite>;

  constructor(dataSource: DataSource) {
    this.memberRepository = dataSource.getRepository(Member);
    this.siteRepository = dataSource.getRepository(MinigridSite);
  }

  async getFinanceAnalytics(filters: any = {}): Promise<FinanceAnalyticsData> {
    const [
      overview,
      revenueBreakdown,
      membershipRevenue,
      paymentTrends,
      geographicRevenue,
      outstandingPayments,
      revenueForecast
    ] = await Promise.all([
      this.getOverview(),
      this.getRevenueBreakdown(),
      this.getMembershipRevenue(),
      this.getPaymentTrends(),
      this.getGeographicRevenue(),
      this.getOutstandingPayments(),
      this.getRevenueForecast()
    ]);

    return {
      overview,
      revenueBreakdown,
      membershipRevenue,
      paymentTrends,
      geographicRevenue,
      outstandingPayments,
      revenueForecast
    };
  }

  private async getOverview(): Promise<FinanceOverview> {
    // Get member counts by tier for revenue calculation
    const memberTiers = await this.memberRepository.createQueryBuilder('member')
      .select('member.membershipType', 'tier')
      .addSelect('COUNT(member.id)', 'count')
      .where('member.membershipStatus = :status', { status: 'ACTIVE' })
      .groupBy('member.membershipType')
      .getRawMany();

    // Monthly fees by tier
    const tierFees = {
      'FULL': 100,
      'ASSOCIATE': 50,
      'AFFILIATE': 25
    };

    let monthlyRecurringRevenue = 0;
    let totalMembershipFees = 0;

    memberTiers.forEach(tier => {
      const memberCount = parseInt(tier.count);
      const monthlyFee = tierFees[tier.tier] || 30;
      const monthlyRevenue = memberCount * monthlyFee;
      
      monthlyRecurringRevenue += monthlyRevenue;
      totalMembershipFees += monthlyRevenue * 12; // Annual
    });

    // Mock additional revenue sources
    const totalCertificationFees = 15000; // Mock certification fees
    const otherRevenue = 5000; // Mock other revenue
    
    const totalRevenue = totalMembershipFees + totalCertificationFees + otherRevenue;
    
    const totalMembers = memberTiers.reduce((sum, tier) => sum + parseInt(tier.count), 0);
    const averageRevenuePerMember = totalMembers > 0 ? totalRevenue / totalMembers : 0;

    // Mock financial metrics
    const totalPendingPayments = 8500;
    const revenueGrowthRate = 12.5; // 12.5% growth
    const paymentCompletionRate = 94.2; // 94.2% completion rate

    return {
      totalRevenue,
      monthlyRecurringRevenue,
      averageRevenuePerMember: Number(averageRevenuePerMember.toFixed(2)),
      totalPendingPayments,
      revenueGrowthRate,
      paymentCompletionRate,
      totalMembershipFees,
      totalCertificationFees
    };
  }

  private async getRevenueBreakdown(): Promise<RevenueBreakdownData[]> {
    const overview = await this.getOverview();
    const totalRevenue = overview.totalRevenue;

    return [
      {
        category: 'Membership Fees',
        amount: overview.totalMembershipFees,
        percentage: Number(((overview.totalMembershipFees / totalRevenue) * 100).toFixed(1)),
        growth: 8.5
      },
      {
        category: 'Certification Fees',
        amount: overview.totalCertificationFees,
        percentage: Number(((overview.totalCertificationFees / totalRevenue) * 100).toFixed(1)),
        growth: 22.3
      },
      {
        category: 'Event & Training',
        amount: 12000,
        percentage: Number(((12000 / totalRevenue) * 100).toFixed(1)),
        growth: 15.8
      },
      {
        category: 'Consultation Services',
        amount: 8000,
        percentage: Number(((8000 / totalRevenue) * 100).toFixed(1)),
        growth: -2.1
      },
      {
        category: 'Other Revenue',
        amount: 5000,
        percentage: Number(((5000 / totalRevenue) * 100).toFixed(1)),
        growth: 5.2
      }
    ];
  }

  private async getMembershipRevenue(): Promise<MembershipRevenueData[]> {
    const memberTiers = await this.memberRepository.createQueryBuilder('member')
      .select('member.membershipType', 'tier')
      .addSelect('COUNT(member.id)', 'count')
      .where('member.membershipStatus = :status', { status: 'ACTIVE' })
      .groupBy('member.membershipType')
      .getRawMany();

    const tierFees = { 'FULL': 100, 'ASSOCIATE': 50, 'AFFILIATE': 25 };
    const tierRetention = { 'FULL': 96, 'ASSOCIATE': 92, 'AFFILIATE': 85 };

    return memberTiers.map(tier => {
      const memberCount = parseInt(tier.count);
      const monthlyFee = tierFees[tier.tier] || 30;
      const totalMonthlyRevenue = memberCount * monthlyFee;
      const annualRevenue = totalMonthlyRevenue * 12;

      return {
        tier: tier.tier,
        memberCount,
        monthlyFee,
        totalMonthlyRevenue,
        annualRevenue,
        retention: tierRetention[tier.tier] || 88
      };
    });
  }

  private async getPaymentTrends(): Promise<PaymentTrendData[]> {
    const trends: PaymentTrendData[] = [];
    const months = 12;

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      // Mock trend data with some realistic patterns
      const baseRevenue = 8000;
      const seasonalFactor = 1 + (Math.sin((date.getMonth() / 12) * Math.PI * 2) * 0.2);
      const growthFactor = 1 + ((months - 1 - i) * 0.02); // 2% monthly growth
      
      const revenue = Math.round(baseRevenue * seasonalFactor * growthFactor);
      const membershipFees = Math.round(revenue * 0.75);
      const certificationFees = Math.round(revenue * 0.15);
      const otherFees = revenue - membershipFees - certificationFees;
      const pendingPayments = Math.round(revenue * 0.08);

      trends.push({
        month,
        revenue,
        membershipFees,
        certificationFees,
        otherFees,
        pendingPayments
      });
    }

    return trends;
  }

  private async getGeographicRevenue(): Promise<GeographicRevenueData[]> {
    const result = await this.memberRepository.createQueryBuilder('member')
      .select('member.country', 'country')
      .addSelect('COUNT(member.id)', 'memberCount')
      .where('member.membershipStatus = :status', { status: 'ACTIVE' })
      .andWhere('member.country IS NOT NULL')
      .andWhere('member.country != :empty', { empty: '' })
      .groupBy('member.country')
      .orderBy('"memberCount"', 'DESC')
      .getRawMany();

    const tierFees = { 'FULL': 100, 'ASSOCIATE': 50, 'AFFILIATE': 25 };
    const averageFee = 65; // Average across all tiers

    let totalRevenue = 0;
    const geoRevenue = result.map(item => {
      const memberCount = parseInt(item.memberCount);
      const revenue = memberCount * averageFee * 12; // Annual revenue
      totalRevenue += revenue;
      
      return {
        country: item.country,
        revenue,
        memberCount,
        averageRevenuePerMember: revenue / memberCount,
        percentage: 0 // Will be calculated after total is known
      };
    });

    // Calculate percentages
    return geoRevenue.map(item => ({
      ...item,
      percentage: Number(((item.revenue / totalRevenue) * 100).toFixed(1))
    }));
  }

  private async getOutstandingPayments(): Promise<OutstandingPaymentsData[]> {
    // Mock outstanding payments data
    const mockPayments = [
      {
        memberName: 'John Doe',
        companyName: 'Solar Energy Ltd',
        amount: 500,
        dueDate: '2024-11-15',
        daysOverdue: 18,
        paymentType: 'Membership Fee',
        status: 'Overdue'
      },
      {
        memberName: 'Jane Smith',
        companyName: 'Green Power Corp',
        amount: 250,
        dueDate: '2024-11-30',
        daysOverdue: 3,
        paymentType: 'Certification Fee',
        status: 'Overdue'
      },
      {
        memberName: 'Michael Johnson',
        companyName: 'Renewable Solutions Inc',
        amount: 750,
        dueDate: '2024-12-05',
        daysOverdue: 0,
        paymentType: 'Membership Fee',
        status: 'Due Soon'
      },
      {
        memberName: 'Sarah Wilson',
        companyName: 'EcoGrid Systems',
        amount: 300,
        dueDate: '2024-10-20',
        daysOverdue: 44,
        paymentType: 'Training Fee',
        status: 'Critical'
      }
    ];

    return mockPayments;
  }

  private async getRevenueForecast(): Promise<RevenueForecastData[]> {
    const forecast: RevenueForecastData[] = [];
    const months = 6; // 6 month forecast

    for (let i = 0; i < months; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      const month = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      const baseRevenue = 10000;
      const growthFactor = 1 + (i * 0.03); // 3% monthly projected growth
      const projectedRevenue = Math.round(baseRevenue * growthFactor);
      
      const confirmedRevenue = Math.round(projectedRevenue * 0.7); // 70% confirmed
      const potentialRevenue = Math.round(projectedRevenue * 0.3); // 30% potential
      const confidenceLevel = Math.max(95 - (i * 5), 70); // Decreasing confidence

      forecast.push({
        month,
        projectedRevenue,
        confirmedRevenue,
        potentialRevenue,
        confidenceLevel
      });
    }

    return forecast;
  }
}