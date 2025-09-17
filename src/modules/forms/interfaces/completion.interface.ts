export interface MemberCompletionRate {
  memberId: string;
  memberName?: string;
  totalForms: number;
  completedForms: number;
  completionRate: number;
  formBreakdown: FormCompletionBreakdown[];
}

export interface FormCompletionBreakdown {
  formId: string;
  formTitle: string;
  formType: string;
  totalQuestions: number;
  answeredQuestions: number;
  completionRate: number;
  lastSubmissionDate?: Date;
  isCompleted: boolean;
  categoriesCompletion: CategoryCompletion[];
}

export interface CategoryCompletion {
  categoryId: string;
  categoryName: string;
  totalQuestions: number;
  answeredQuestions: number;
  completionRate: number;
  questions: QuestionCompletion[];
}

export interface QuestionCompletion {
  questionId: string;
  questionKpi: string;
  questionSlug: string;
  isAnswered: boolean;
  answer?: any;
}

export interface SiteCompletion {
  siteId: string;
  siteName: string;
  memberId: string;
  totalForms: number;
  completedForms: number;
  completionRate: number;
  formBreakdown: FormCompletionBreakdown[];
}

export interface CompletionStats {
  totalMembers: number;
  totalForms: number;
  totalSites: number;
  averageCompletionRate: number;
  completionByFormType: { [key: string]: number };
  completionTrend: CompletionTrendPoint[];
  topPerformingMembers: MemberCompletionSummary[];
  lowPerformingMembers: MemberCompletionSummary[];
}

export interface MemberCompletionSummary {
  memberId: string;
  memberName?: string;
  completionRate: number;
  totalForms: number;
  completedForms: number;
}

export interface CompletionTrendPoint {
  date: string;
  completionRate: number;
  totalSubmissions: number;
}
