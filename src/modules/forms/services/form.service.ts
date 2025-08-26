// src/forms/services/FormService.ts

import { CreateFormDto, UpdateFormDto } from "../../../shared/types/form.types";
import { Pagination } from "../dtos/form.dto";
import { IFormRepository } from "../interfaces/form.interface";

export class FormService {
  constructor(private readonly repo: IFormRepository) {}

  async create(dto: CreateFormDto) {
    return this.repo.create(dto);
  }

  async update(dto: UpdateFormDto) {
    return this.repo.update(dto);
  }

  async delete(id: string) {
    await this.repo.delete(id);
  }

  async findById(id: string) {
    const form = await this.repo.findById(id);
    if (!form) throw new Error('Form not found');
    return form;
  }

  async findBySlug(slug: string) {
    const form = await this.repo.findBySlug(slug);
    if (!form) throw new Error('Form not found');
    return form;
  }

  async findAll(pagination?: Pagination) {
    return this.repo.findAll(pagination);
  }
}