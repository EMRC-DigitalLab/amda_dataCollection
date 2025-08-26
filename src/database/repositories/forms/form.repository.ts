// src/forms/repos/TypeORMFormRepository.ts
import { Injectable } from 'injection-js';
import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config';
import { Pagination } from '../../../modules/forms/dtos/form.dto';
import { IFormRepository } from '../../../modules/forms/interfaces/form.interface';
import { CreateFormDto, UpdateFormDto } from '../../../shared/types/form.types';
import { Form } from '../../entities/form.entity';
import { Question } from '../../entities/question.entity';

@Injectable()
export class FormRepository implements IFormRepository {
  private readonly formRepo: Repository<Form> = AppDataSource.getRepository(Form);
  private readonly qRepo: Repository<Question> = AppDataSource.getRepository(Question);

  async create(dto: CreateFormDto): Promise<Form> {
    const form = this.formRepo.create({ title: dto.title!, slug: dto.slug });
    await this.assertSlugUnique(form.slug);
    const saved = await this.formRepo.save(form);
1
    const questions = dto.questions.map(q =>
      this.qRepo.create({ ...q, form: saved }),
    );
    await this.qRepo.save(questions);
    return (await this.findById(saved.id))!;
  }

  async update({ id, ...changes }: UpdateFormDto): Promise<Form> {
    const form = await this.findByIdOrFail(id);
    if (changes.slug && changes.slug !== form.slug) {
      await this.assertSlugUnique(changes.slug);
    }
    Object.assign(form, changes);
    await this.formRepo.save(form);

    if (changes.questions) {
      await this.qRepo.delete({ form: { id } });
      await this.qRepo.insert(
        changes.questions.map(q => ({ ...q, form: { id } })),
      );
    }
    return (await this.findById(id))!;
  }

  async delete(id: string): Promise<void> {
    const res = await this.formRepo.delete(id);
    if (res.affected === 0) throw new Error('Form not found');
  }

  async findById(id: string): Promise<Form | null> {
    return this.formRepo.findOne({
      where: { id },
      relations: { questions: true },
      order: { questions: { id: 'ASC' } },
    });
  }

  async findBySlug(slug: string): Promise<Form | null> {
    return this.formRepo.findOne({
      where: { slug },
      relations: { questions: true },
    });
  }

  async findAll({ skip = 0, take = 50 }: Pagination = {}): Promise<[Form[], number]> {
    return this.formRepo.findAndCount({
      relations: { questions: true },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  /* private -------------------------------------------------------------- */
  private async assertSlugUnique(slug: string): Promise<void> {
    const exists = await this.formRepo.exist({ where: { slug } });
    if (exists) throw new Error('Slug already taken');
  }

  private async findByIdOrFail(id: string): Promise<Form> {
    const form = await this.findById(id);
    if (!form) throw new Error('Form not found');
    return form;
  }
}