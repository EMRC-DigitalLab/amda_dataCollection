// src/forms/repos/TypeORMFormRepository.ts
import { Injectable } from 'injection-js';
import { DataSource, Repository } from 'typeorm';

import { IFormRepository } from '../../../modules/forms/interfaces/form.interface';
import { CreateFormDto, UpdateFormDto } from '../../../shared/types/form.types';
import { Form } from '../../entities/form.entity';
import { Question } from '../../entities/question.entity';

@Injectable()
export class FormRepository extends Repository<any> implements IFormRepository {
  private readonly questionRepo: Repository<any>;

  constructor(dataSource: DataSource) {
    super(Form, dataSource.manager);
    this.questionRepo = dataSource.getRepository(Question);
  }

  /* -------------------------------------------------- */
  /*  IFormRepository implementation                    */
  /* -------------------------------------------------- */
  async createForm(dto: CreateFormDto): Promise<any> {
    await this.assertSlugUnique(dto.slug);

    const form = super.create({ title: dto.title, slug: dto.slug });
    const savedForm = await this.save(form);

    const questions = dto.questions!.map(q => this.questionRepo.create({ ...q, form: savedForm }));
    await this.questionRepo.save(questions);

    return (await this.findFormById(savedForm.id))!;
  }

  // @ts-nocheck
  async updateForm({ id, ...changes }: UpdateFormDto): Promise<any> {
    const form = await this.findFormByIdOrFail(id);

    if (changes.slug && changes.slug !== form.slug) {
      await this.assertSlugUnique(changes.slug);
    }
    Object.assign(form, changes);
    await this.save(form);

    if (changes.questions) {
      await this.questionRepo.delete({ form: { id } });
      const questions = changes.questions.map(q =>
        this.questionRepo.create({ ...q, form: { id } as any })
      );
      await this.questionRepo.save(questions);
    }
    return (await this.findFormById(id))!;
  }

  async deleteForm(id: string): Promise<void> {
    const res = await super.delete(id);
    if (res.affected === 0) throw new Error('Form not found');
  }

  async findFormById(id: string): Promise<Form | null> {
    return this.findOne({
      where: { id },
      relations: { questions: true },
      order: { questions: { id: 'ASC' } },
    });
  }

  async findFormBySlug(slug: string): Promise<Form | null> {
    return this.findOne({
      where: { slug },
      relations: { questions: true },
    });
  }

  async findAllForms({ skip = 0, take = 50 }: { skip?: number; take?: number } = {}): Promise<
    [Form[], number]
  > {
    return this.findAndCount({
      relations: { questions: true },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  /* -------------------------------------------------- */
  /*  Helper methods                                    */
  /* -------------------------------------------------- */
  private async assertSlugUnique(slug: string): Promise<void> {
    const exists = await this.exists({ where: { slug } });
    if (exists) throw new Error('Slug already taken');
  }

  private async findFormByIdOrFail(id: string): Promise<Form> {
    const form = await this.findFormById(id);
    if (!form) throw new Error('Form not found');
    return form;
  }
}
