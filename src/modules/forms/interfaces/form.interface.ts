// src/forms/repos/form-repository.interface.ts

import { Form } from '../../../database/entities/form.entity';
import { FORM_REPOSITORY_DESC } from '../../../shared/constants/form';
import { CreateFormDto, UpdateFormDto } from '../../../shared/types/form.types';

export const FORM_REPOSITORY = Symbol(FORM_REPOSITORY_DESC);

export interface IFormRepository {
  createForm(dto: CreateFormDto): Promise<Form>;
  updateForm(dto: UpdateFormDto): Promise<Form>;
  deleteForm(id: string): Promise<void>;
  findFormById(id: string): Promise<Form | null>;
  findFormBySlug(slug: string): Promise<Form | null>;
  findAllForms(opts?: { skip?: number; take?: number }): Promise<[Form[], number]>;
}
