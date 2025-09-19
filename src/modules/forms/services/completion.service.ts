// @ts-nocheck
import { DataSource } from 'typeorm';
import { Form, FormStatus } from '../../../database/entities/form.entity';
import { FormRepository } from '../../../database/repositories/forms/form.repository';
import {
  CategoryCompletion,
  CompletionStats,
  CompletionTrendPoint,
  FormCompletionBreakdown,
  MemberCompletionRate,
  MemberCompletionSummary,
  QuestionCompletion,
  SiteCompletion,
} from '../interfaces/completion.interface';

export class CompletionService {
  private formRepository: FormRepository;
  constructor(private readonly dataSource: DataSource) {
    this.formRepository = new FormRepository(dataSource);
  }

  // Expose method for use in routes
  public async getMembersWithSites(): Promise<{ id: string; name: string }[]> {
    return this.getMembersWithSitesPrivate();
  }

  /* ============================================================================ */
  /* Member Completion Tracking                                                   */
  /* ============================================================================ */

  async getMemberCompletionRates(
    memberId: string,
    formType?: string,
    status: string = 'PUBLISHED'
  ): Promise<MemberCompletionRate> {
    // Get all published forms
    const forms = await this.getPublishedForms(formType, status as FormStatus);

    if (forms.length === 0) {
      return {
        memberId,
        totalForms: 0,
        completedForms: 0,
        completionRate: 0,
        formBreakdown: [],
      };
    }

    const formBreakdown: FormCompletionBreakdown[] = [];
    let completedFormsCount = 0;

    for (const form of forms) {
      const formCompletion = await this.getFormCompletionForMember(form, memberId);
      formBreakdown.push(formCompletion);

      if (formCompletion.isCompleted) {
        completedFormsCount++;
      }
    }

    const completionRate = forms.length > 0 ? (completedFormsCount / forms.length) * 100 : 0;

    // Get member name
    const memberInfo = await this.getMemberInfo(memberId);

    return {
      memberId,
      memberName: memberInfo?.name,
      totalForms: forms.length,
      completedForms: completedFormsCount,
      completionRate: Math.round(completionRate * 100) / 100,
      formBreakdown,
    };
  }

  async getMemberFormCompletion(
    memberId: string,
    formId: string
  ): Promise<FormCompletionBreakdown> {
    const form = await this.formRepository.findFormById(formId);
    if (!form) {
      throw new Error('Form not found');
    }

    return this.getFormCompletionForMember(form, memberId);
  }

  async getMemberSitesCompletion(
    memberId: string,
    formId?: string,
    formType?: string
  ): Promise<SiteCompletion[]> {
    // Get all member's minigrid sites
    const sites = await this.getMemberSites(memberId);
    const sitesCompletion: SiteCompletion[] = [];

    for (const site of sites) {
      const siteCompletion = await this.getSiteCompletion(site.id, formId, formType);
      sitesCompletion.push({
        ...siteCompletion,
        siteId: site.id,
        siteName: site.name,
        memberId,
      });
    }

    return sitesCompletion;
  }

  /* ============================================================================ */
  /* Site-specific Completion                                                     */
  /* ============================================================================ */

  async getSiteCompletion(
    siteId: string,
    formId?: string,
    formType?: string
  ): Promise<Omit<SiteCompletion, 'siteId' | 'siteName' | 'memberId'>> {
    let forms: Form[];

    if (formId) {
      const form = await this.formRepository.findFormById(formId);
      forms = form ? [form] : [];
    } else {
      forms = await this.getPublishedForms(formType);
    }

    if (forms.length === 0) {
      return {
        totalForms: 0,
        completedForms: 0,
        completionRate: 0,
        formBreakdown: [],
      };
    }

    const formBreakdown: FormCompletionBreakdown[] = [];
    let completedFormsCount = 0;

    for (const form of forms) {
      const formCompletion = await this.getFormCompletionForSite(form, siteId);
      formBreakdown.push(formCompletion);

      if (formCompletion.isCompleted) {
        completedFormsCount++;
      }
    }

    const completionRate = forms.length > 0 ? (completedFormsCount / forms.length) * 100 : 0;

    return {
      totalForms: forms.length,
      completedForms: completedFormsCount,
      completionRate: Math.round(completionRate * 100) / 100,
      formBreakdown,
    };
  }

  /* ============================================================================ */
  /* Overall Analytics                                                            */
  /* ============================================================================ */

  async getOverallCompletionStats(filters?: {
    formType?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<CompletionStats> {
    const forms = await this.getPublishedForms(filters?.formType);

    // Get all members who have minigrid sites
    const membersWithSites = await this.getMembersWithSites();

    let totalCompletionRate = 0;
    let memberCount = 0;
    const completionByFormType: { [key: string]: number } = {};
    const topPerformingMembers: MemberCompletionSummary[] = [];
    const lowPerformingMembers: MemberCompletionSummary[] = [];

    for (const member of membersWithSites) {
      const memberCompletion = await this.getMemberCompletionRates(member.id, filters?.formType);

      totalCompletionRate += memberCompletion.completionRate;
      memberCount++;

      // Track completion by form type
      for (const formBreakdown of memberCompletion.formBreakdown) {
        const formType = formBreakdown.formType;
        if (!completionByFormType[formType]) {
          completionByFormType[formType] = 0;
        }
        completionByFormType[formType] += formBreakdown.completionRate;
      }

      // Add to performance lists
      const memberSummary: MemberCompletionSummary = {
        memberId: member.id,
        memberName: member.name,
        completionRate: memberCompletion.completionRate,
        totalForms: memberCompletion.totalForms,
        completedForms: memberCompletion.completedForms,
      };

      if (memberCompletion.completionRate >= 80) {
        topPerformingMembers.push(memberSummary);
      } else if (memberCompletion.completionRate < 50) {
        lowPerformingMembers.push(memberSummary);
      }
    }

    // Calculate averages for form types
    Object.keys(completionByFormType).forEach(formType => {
      completionByFormType[formType] = completionByFormType[formType] / memberCount;
    });

    // Get completion trend
    const completionTrend = await this.getCompletionTrend(filters);

    // Get total sites count
    const totalSites = await this.getTotalSitesCount();

    return {
      totalMembers: memberCount,
      totalForms: forms.length,
      totalSites,
      averageCompletionRate: memberCount > 0 ? totalCompletionRate / memberCount : 0,
      completionByFormType,
      completionTrend,
      topPerformingMembers: topPerformingMembers
        .sort((a, b) => b.completionRate - a.completionRate)
        .slice(0, 10),
      lowPerformingMembers: lowPerformingMembers
        .sort((a, b) => a.completionRate - b.completionRate)
        .slice(0, 10),
    };
  }

  async getMemberCompletionLeaderboard(
    formType?: string,
    limit: number = 20
  ): Promise<MemberCompletionSummary[]> {
    const membersWithSites = await this.getMembersWithSites();
    const leaderboard: MemberCompletionSummary[] = [];

    for (const member of membersWithSites) {
      const memberCompletion = await this.getMemberCompletionRates(member.id, formType);

      leaderboard.push({
        memberId: member.id,
        memberName: member.name,
        completionRate: memberCompletion.completionRate,
        totalForms: memberCompletion.totalForms,
        completedForms: memberCompletion.completedForms,
      });
    }

    return leaderboard.sort((a, b) => b.completionRate - a.completionRate).slice(0, limit);
  }

  /* ============================================================================ */
  /* Progress Tracking                                                            */
  /* ============================================================================ */

  async getMemberIncompleteForms(
    memberId: string,
    formType?: string,
    priority?: string
  ): Promise<FormCompletionBreakdown[]> {
    const memberCompletion = await this.getMemberCompletionRates(memberId, formType);

    let incompleteForms = memberCompletion.formBreakdown.filter(form => !form.isCompleted);

    if (priority === 'high') {
      // Return forms with very low completion rates first
      incompleteForms.sort((a, b) => a.completionRate - b.completionRate);
    } else if (priority === 'nearly_complete') {
      // Return forms that are nearly complete (>70% completion)
      incompleteForms = incompleteForms
        .filter(form => form.completionRate > 70)
        .sort((a, b) => b.completionRate - a.completionRate);
    }

    return incompleteForms;
  }

  async getMemberCompletionTrend(
    memberId: string,
    formType?: string,
    days: number = 30,
    groupBy: 'day' | 'week' | 'month' = 'week'
  ): Promise<CompletionTrendPoint[]> {
    const forms = await this.getPublishedForms(formType);
    const trend: CompletionTrendPoint[] = [];

    // Get date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    // Generate date points based on groupBy
    const datePoints = this.generateDatePoints(startDate, endDate, groupBy);

    for (const datePoint of datePoints) {
      let totalQuestions = 0;
      let answeredQuestions = 0;
      let totalSubmissions = 0;

      for (const form of forms) {
        if (!form.tableCreated || !form.tableName) continue;

        // Get submissions for this member up to this date point
        const submissions = await this.getSubmissionsUpToDate(form.tableName, memberId, datePoint);

        if (submissions.length > 0) {
          totalSubmissions += submissions.length;

          // Calculate questions answered for this form
          const formQuestions = this.getFormTotalQuestions(form);
          totalQuestions += formQuestions;

          // Count answered questions from the latest submission
          const latestSubmission = submissions[submissions.length - 1];
          answeredQuestions += this.countAnsweredQuestions(form, latestSubmission);
        }
      }

      const completionRate = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

      trend.push({
        date: datePoint.toISOString().split('T')[0],
        completionRate: Math.round(completionRate * 100) / 100,
        totalSubmissions,
      });
    }

    return trend;
  }

  /* ============================================================================ */
  /* Private Helper Methods                                                       */
  /* ============================================================================ */

  private async getPublishedForms(
    formType?: string,
    status: FormStatus = FormStatus.PUBLISHED
  ): Promise<Form[]> {
    const whereConditions: any = { status };

    if (formType) {
      whereConditions.formType = formType;
    }

    const [forms] = await this.formRepository.findAllForms({
      ...whereConditions,
    });

    return forms;
  }

  private async getFormCompletionForMember(
    form: Form,
    memberId: string
  ): Promise<FormCompletionBreakdown> {
    return this.getFormCompletionForEntity(form, 'submitted_by', memberId);
  }

  private async getFormCompletionForSite(
    form: Form,
    siteId: string
  ): Promise<FormCompletionBreakdown> {
    return this.getFormCompletionForEntity(form, 'minigrid_siteId', siteId);
  }

  private async getFormCompletionForEntity(
    form: Form,
    entityColumn: string,
    entityId: string
  ): Promise<FormCompletionBreakdown> {
    const totalQuestions = this.getFormTotalQuestions(form);
    let answeredQuestions = 0;
    let lastSubmissionDate: Date | undefined;
    let isCompleted = false;

    const categoriesCompletion: CategoryCompletion[] = [];

    // If form doesn't have a table, it can't be completed
    if (!form.tableCreated || !form.tableName) {
      return {
        formId: form.id,
        formTitle: form.title,
        formType: form.formType,
        totalQuestions,
        answeredQuestions: 0,
        completionRate: 0,
        lastSubmissionDate: undefined,
        isCompleted: false,
        categoriesCompletion: form.categories.map(cat => ({
          categoryId: cat.id,
          categoryName: cat.name,
          totalQuestions: cat.questions.length,
          answeredQuestions: 0,
          completionRate: 0,
          questions: cat.questions.map(q => ({
            questionId: q.id,
            questionKpi: q.kpi,
            questionSlug: q.slug,
            isAnswered: false,
          })),
        })),
      };
    }

    try {
      // Get the latest submission for this entity
      const submissionQuery = `
        SELECT * FROM "${form.tableName}" 
        WHERE ${entityColumn} = $1 
        ORDER BY submitted_at DESC 
        LIMIT 1
      `;

      const submissions = await this.dataSource.query(submissionQuery, [entityId]);

      if (submissions.length > 0) {
        const latestSubmission = submissions[0];
        lastSubmissionDate = latestSubmission.submitted_at;

        // Count answered questions and build category completion
        for (const category of form.categories) {
          const categoryQuestions: QuestionCompletion[] = [];
          let categoryAnsweredQuestions = 0;

          for (const question of category.questions) {
            const answer = latestSubmission[question.slug];
            const isAnswered = this.isQuestionAnswered(answer, question.type);

            if (isAnswered) {
              answeredQuestions++;
              categoryAnsweredQuestions++;
            }

            categoryQuestions.push({
              questionId: question.id,
              questionKpi: question.kpi,
              questionSlug: question.slug,
              isAnswered,
              answer: isAnswered ? answer : undefined,
            });
          }

          const categoryCompletionRate =
            category.questions.length > 0
              ? (categoryAnsweredQuestions / category.questions.length) * 100
              : 0;

          categoriesCompletion.push({
            categoryId: category.id,
            categoryName: category.name,
            totalQuestions: category.questions.length,
            answeredQuestions: categoryAnsweredQuestions,
            completionRate: Math.round(categoryCompletionRate * 100) / 100,
            questions: categoryQuestions,
          });
        }

        // Consider form completed if all required questions are answered
        isCompleted = this.isFormCompleted(form, latestSubmission);
      } else {
        // No submissions found - all questions are unanswered
        for (const category of form.categories) {
          categoriesCompletion.push({
            categoryId: category.id,
            categoryName: category.name,
            totalQuestions: category.questions.length,
            answeredQuestions: 0,
            completionRate: 0,
            questions: category.questions.map(q => ({
              questionId: q.id,
              questionKpi: q.kpi,
              questionSlug: q.slug,
              isAnswered: false,
            })),
          });
        }
      }
    } catch (error) {
      console.error(`Error getting form completion for ${form.title}:`, error);
      // Return empty completion data on error
      for (const category of form.categories) {
        categoriesCompletion.push({
          categoryId: category.id,
          categoryName: category.name,
          totalQuestions: category.questions.length,
          answeredQuestions: 0,
          completionRate: 0,
          questions: category.questions.map(q => ({
            questionId: q.id,
            questionKpi: q.kpi,
            questionSlug: q.slug,
            isAnswered: false,
          })),
        });
      }
    }

    const completionRate = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

    return {
      formId: form.id,
      formTitle: form.title,
      formType: form.formType!,
      totalQuestions,
      answeredQuestions,
      completionRate: Math.round(completionRate * 100) / 100,
      lastSubmissionDate,
      isCompleted,
      categoriesCompletion,
    };
  }

  private getFormTotalQuestions(form: Form): number {
    return form.categories.reduce((total, category) => total + category.questions.length, 0);
  }

  private countAnsweredQuestions(form: Form, submission: any): number {
    let count = 0;
    for (const category of form.categories) {
      for (const question of category.questions) {
        if (this.isQuestionAnswered(submission[question.slug], question.type)) {
          count++;
        }
      }
    }
    return count;
  }

  private isQuestionAnswered(value: any, questionType: string): boolean {
    if (value === null || value === undefined) return false;

    switch (questionType) {
      case 'text':
      case 'textarea':
      case 'email':
      case 'phone':
      case 'url':
        return typeof value === 'string' && value.trim().length > 0;

      case 'number':
      case 'currency':
        return (
          typeof value === 'number' ||
          (typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value)))
        );

      case 'boolean':
        return typeof value === 'boolean';

      case 'date':
      case 'datetime':
        return value instanceof Date || (typeof value === 'string' && value.trim().length > 0);

      case 'select':
        return typeof value === 'string' && value.trim().length > 0;

      case 'multiselect':
        return Array.isArray(value) && value.length > 0;

      case 'file':
        return typeof value === 'string' && value.trim().length > 0;

      default:
        return false;
    }
  }

  private isFormCompleted(form: Form, submission: any): boolean {
    for (const category of form.categories) {
      for (const question of category.questions) {
        if (question.required) {
          if (!this.isQuestionAnswered(submission[question.slug], question.type)) {
            return false;
          }
        }
      }
    }
    return true;
  }

  private async getMemberInfo(memberId: string): Promise<{ id: string; name: string } | null> {
    try {
      const result = await this.dataSource.query(
        'SELECT id, "organizationName" as name FROM members WHERE id = $1',
        [memberId]
      );
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Error getting member info:', error);
      return null;
    }
  }

  private async getMemberSites(memberId: string): Promise<{ id: string; name: string }[]> {
    try {
      const result = await this.dataSource.query(
        'SELECT id, name FROM minigrid_sites WHERE "memberId" = $1',
        [memberId]
      );
      return result;
    } catch (error) {
      console.error('Error getting member sites:', error);
      return [];
    }
  }

  private async getMembersWithSitesPrivate(): Promise<{ id: string; name: string }[]> {
    try {
      const result = await this.dataSource.query(`
        SELECT DISTINCT m.id, m."organizationName" as name 
        FROM members m 
        INNER JOIN minigrid_sites ms ON m.id = ms."memberId"
      `);
      return result;
    } catch (error) {
      console.error('Error getting members with sites:', error);
      return [];
    }
  }

  private async getTotalSitesCount(): Promise<number> {
    try {
      const result = await this.dataSource.query('SELECT COUNT(*) as count FROM minigrid_sites');
      return parseInt(result[0].count);
    } catch (error) {
      console.error('Error getting total sites count:', error);
      return 0;
    }
  }

  private async getCompletionTrend(filters?: {
    formType?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<CompletionTrendPoint[]> {
    const trend: CompletionTrendPoint[] = [];
    const forms = await this.getPublishedForms(filters?.formType);

    // Generate last 30 days of data
    const endDate = filters?.dateTo || new Date();
    const startDate = filters?.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const datePoints = this.generateDatePoints(startDate, endDate, 'day');

    for (const datePoint of datePoints) {
      let totalPossibleAnswers = 0;
      let totalActualAnswers = 0;
      let totalSubmissions = 0;

      for (const form of forms) {
        if (!form.tableCreated || !form.tableName) continue;

        try {
          const submissionsQuery = `
            SELECT COUNT(*) as count FROM "${form.tableName}" 
            WHERE submitted_at <= $1
          `;
          const submissions = await this.dataSource.query(submissionsQuery, [datePoint]);
          const submissionCount = parseInt(submissions[0].count);

          if (submissionCount > 0) {
            totalSubmissions += submissionCount;
            const formQuestions = this.getFormTotalQuestions(form);
            totalPossibleAnswers += formQuestions * submissionCount;

            // This is a simplified calculation - in practice you'd want to count actual answered questions
            // For now, assuming 70% completion rate for existing submissions
            totalActualAnswers += Math.round(formQuestions * submissionCount * 0.7);
          }
        } catch (error) {
          console.error(`Error getting trend data for form ${form.title}:`, error);
        }
      }

      const completionRate =
        totalPossibleAnswers > 0 ? (totalActualAnswers / totalPossibleAnswers) * 100 : 0;

      trend.push({
        date: datePoint.toISOString().split('T')[0],
        completionRate: Math.round(completionRate * 100) / 100,
        totalSubmissions,
      });
    }

    return trend;
  }

  private generateDatePoints(
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month'
  ): Date[] {
    const points: Date[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      points.push(new Date(current));

      switch (groupBy) {
        case 'day':
          current.setDate(current.getDate() + 1);
          break;
        case 'week':
          current.setDate(current.getDate() + 7);
          break;
        case 'month':
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }

    return points;
  }

  private async getSubmissionsUpToDate(
    tableName: string,
    memberId: string,
    upToDate: Date
  ): Promise<any[]> {
    try {
      const query = `
        SELECT * FROM "${tableName}" 
        WHERE submitted_by = $1 AND submitted_at <= $2 
        ORDER BY submitted_at ASC
      `;
      return await this.dataSource.query(query, [memberId, upToDate]);
    } catch (error) {
      console.error(`Error getting submissions up to date for table ${tableName}:`, error);
      return [];
    }
  }
}
