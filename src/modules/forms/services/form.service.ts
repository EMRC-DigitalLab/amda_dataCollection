// src/forms/services/FormService.ts
import { CreateFormDto, UpdateFormDto } from '../../../shared/types/form.types';
import { Pagination } from '../dtos/form.dto';
import { IFormRepository } from '../interfaces/form.interface';

export class FormService {
  constructor(private readonly repo: IFormRepository) {}

  async create(dto: CreateFormDto) {
    return this.repo.createForm(dto);
  }

  async update(dto: UpdateFormDto) {
    return this.repo.updateForm(dto);
  }

  async delete(id: string) {
    await this.repo.deleteForm(id);
  }

  async findById(id: string) {
    const form = await this.repo.findFormById(id);
    if (!form) throw new Error('Form not found');
    return form;
  }

  async findBySlug(slug: string) {
    const form = await this.repo.findFormBySlug(slug);
    if (!form) throw new Error('Form not found');
    return form;
  }

  async findAll(pagination?: Pagination) {
    return this.repo.findAllForms(pagination);
  }
}
