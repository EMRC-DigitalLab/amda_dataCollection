export type QuestionType =
  | 'text'
  | 'number'
  | 'textarea'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'boolean';


  export class CreateFormDto {
    title!: string;
    slug!: string;
    questions!: CreateQuestionDto[];
  }
  export class UpdateFormDto {
    id!: string;
    title?: string;
    slug?: string;
    questions?: CreateQuestionDto[];
  }
  export class CreateQuestionDto {
    kpi!: string;
    description!: string;
    slug!: string;
    required!: boolean;
    type!: string;
    options?: Record<string, any>;
  }
  