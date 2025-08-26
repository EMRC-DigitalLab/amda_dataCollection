// src/forms/repos/form-repository.interface.ts

import { Form } from "../../../database/entities/form.entity";
import { FORM_REPOSITORY_DESC } from "../../../shared/constants/form";
import { CreateFormDto, UpdateFormDto } from "../../../shared/types/form.types";

export const FORM_REPOSITORY = Symbol(FORM_REPOSITORY_DESC);

export interface IFormRepository {
  create(dto: CreateFormDto): Promise<Form>;
  update(dto: UpdateFormDto): Promise<Form>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Form | null>;
  findBySlug(slug: string): Promise<Form | null>;
  findAll(opts?: { skip?: number; take?: number }): Promise<[Form[], number]>;
}