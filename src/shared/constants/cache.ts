// src/shared/constants/cache.constants.ts
export const CACHE_TTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 21600, // 6 hours
  DAY: 86400, // 24 hours
  WEEK: 604800, // 7 days
} as const;

export const CACHE_PREFIX = {
  COMPLETION: 'completion',
  FORM: 'form',
  MEMBER: 'member',
  SITE: 'site',
  STATS: 'stats',
  LEADERBOARD: 'leaderboard',
  TREND: 'trend',
} as const;

// src/modules/completion/utils/cache-keys.util.ts
export class CompletionCacheKeys {
  // Member completion rates
  static memberCompletionRates(
    memberId: string,
    formType?: string,
    status: string = 'PUBLISHED'
  ): string {
    return `completion:member:${memberId}:rates:${formType || 'all'}:${status}`;
  }

  // Member form completion details
  static memberFormCompletion(memberId: string, formId: string): string {
    return `completion:member:${memberId}:form:${formId}`;
  }

  // Member sites completion
  static memberSitesCompletion(memberId: string, formId?: string, formType?: string): string {
    return `completion:member:${memberId}:sites:${formId || 'all'}:${formType || 'all'}`;
  }

  // Site completion
  static siteCompletion(siteId: string, formId?: string, formType?: string): string {
    return `completion:site:${siteId}:${formId || 'all'}:${formType || 'all'}`;
  }

  // Overall completion stats
  static overallStats(filters?: { formType?: string; dateFrom?: string; dateTo?: string }): string {
    const filterKey = filters
      ? `${filters.formType || 'all'}:${filters.dateFrom || 'all'}:${filters.dateTo || 'all'}`
      : 'all';
    return `completion:stats:overall:${filterKey}`;
  }

  // Member completion leaderboard
  static leaderboard(formType?: string, limit: number = 20): string {
    return `completion:leaderboard:${formType || 'all'}:${limit}`;
  }

  // Member incomplete forms
  static memberIncompleteForms(memberId: string, formType?: string, priority?: string): string {
    return `completion:member:${memberId}:incomplete:${formType || 'all'}:${priority || 'all'}`;
  }

  // Member completion trend
  static memberCompletionTrend(
    memberId: string,
    formType?: string,
    days: number = 30,
    groupBy: string = 'week'
  ): string {
    return `completion:member:${memberId}:trend:${formType || 'all'}:${days}:${groupBy}`;
  }

  // Published forms
  static publishedForms(formType?: string, status: string = 'PUBLISHED'): string {
    return `forms:published:${formType || 'all'}:${status}`;
  }

  // Members with sites
  static membersWithSites(): string {
    return 'members:with-sites';
  }

  // Member info
  static memberInfo(memberId: string): string {
    return `member:info:${memberId}`;
  }

  // Member sites
  static memberSites(memberId: string): string {
    return `member:sites:${memberId}`;
  }

  // Total sites count
  static totalSitesCount(): string {
    return 'sites:total-count';
  }

  // Form table submissions for member
  static formSubmissions(tableName: string, memberId: string): string {
    return `submissions:${tableName}:member:${memberId}`;
  }

  // Form submissions up to date
  static formSubmissionsUpToDate(tableName: string, memberId: string, date: string): string {
    return `submissions:${tableName}:member:${memberId}:until:${date}`;
  }

  // Pattern for clearing member-related caches
  static memberPattern(memberId: string): string {
    return `*:member:${memberId}:*`;
  }

  // Pattern for clearing form-related caches
  static formPattern(formId?: string): string {
    return formId ? `*:form:${formId}:*` : '*:form:*';
  }

  // Pattern for clearing site-related caches
  static sitePattern(siteId?: string): string {
    return siteId ? `*:site:${siteId}:*` : '*:site:*';
  }

  // Pattern for clearing all completion caches
  static completionPattern(): string {
    return 'completion:*';
  }
}
