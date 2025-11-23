// @ts-nocheck
import { Injectable } from 'injection-js';
import { DataSource, QueryRunner, Repository } from 'typeorm';

import { redisClient } from '../../../config';
import { IFormRepository } from '../../../modules/forms/interfaces/form.interface';
import { CreateCategoryDto, CreateFormDto, UpdateFormDto } from '../../../shared/types/form.types';
import { Category } from '../../entities/category.entity';
import { FormType, FormTypeStatus } from '../../entities/form-type.entity';
import { Form, FormStatus } from '../../entities/form.entity';
import { Question } from '../../entities/question.entity';

@Injectable()
export class FormRepository extends Repository<Form> implements IFormRepository {
  private readonly categoryRepo: Repository<Category>;
  private readonly questionRepo: Repository<Question>;
  private readonly dataSource: DataSource;

  constructor(dataSource: DataSource) {
    super(Form, dataSource.manager);
    this.categoryRepo = dataSource.getRepository(Category);
    this.questionRepo = dataSource.getRepository(Question);
    this.formTypeRepo = dataSource.getRepository(FormType);
    this.dataSource = dataSource;
  }

  /* -------------------------------------------------- */
  /*  IFormRepository implementation                    */
  /* -------------------------------------------------- */

  async createForm(dto: CreateFormDto): Promise<Form> {
    await this.assertSlugUnique(dto.slug);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create form
      const form = this.create({
        title: dto.title,
        slug: dto.slug,
        description: dto.description,
        formTypeId: dto.formTypeId,
        status: dto.status || FormStatus.DRAFT,
        adminId: dto.adminId,
        parentId: dto.parentId,
      });

      const savedForm = await queryRunner.manager.save(Form, form);

      // Create categories and questions if provided
      if (dto.categories && dto.categories.length > 0) {
        await this.createCategoriesWithQuestions(queryRunner, savedForm, dto.categories);
      }

      await queryRunner.commitTransaction();
      return (await this.findFormById(savedForm.id)) as Form;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateForm({ id, ...changes }: UpdateFormDto): Promise<Form> {
    const form = await this.findFormByIdOrFail(id);

    if (changes.slug && changes.slug !== form.slug) {
      await this.assertSlugUnique(changes.slug);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    console.log(changes, 'this is the uodate');
    try {
      // Update form basic info
      Object.assign(form, {
        title: changes.title ?? form.title,
        slug: changes.slug ?? form.slug,
        description: changes.description ?? form.description,
        status: changes.status ?? form.status,
      });

      if (changes.formTypeId !== undefined) {
        if (changes.formTypeId === null) {
          form.formType = null;
          form.formTypeId = null;
        } else {
          // Option B: Just set the ID (works in most cases with allow-infer flag or newer TypeORM)
          form.formTypeId = changes.formTypeId;

          // Force TypeORM to recognize the change
          form.formType = { id: changes.formTypeId } as FormType;
        }
      }
      await queryRunner.manager.save(Form, form);

      // Handle categories update if provided
      if (changes.categories) {
        // Delete existing categories and questions (cascade will handle questions)
        await queryRunner.manager.delete(Category, { form: { id } });

        // Create new categories and questions
        await this.createCategoriesWithQuestions(queryRunner, form, changes.categories);
      }

      await queryRunner.commitTransaction();
      return (await this.findFormById(id)) as Form;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteForm(id: string): Promise<void> {
    const form = await this.findFormById(id);
    if (!form) throw new Error('Form not found');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // If form has a dynamic table, drop it
      if (form.tableCreated && form.tableName) {
        await queryRunner.query(`DROP TABLE IF EXISTS "${form.tableName}" CASCADE`);
      }

      // Delete form (cascade will handle categories and questions)
      const result = await queryRunner.manager.delete(Form, id);
      if (result.affected === 0) throw new Error('Form not found');

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findFormById(id: string): Promise<Form | null> {
    return this.findOne({
      where: { id },
      relations: {
        categories: {
          questions: true,
        },
        admin: true,
        parent: true,
        formType: true,
      },
      order: {
        categories: { sortOrder: 'ASC' },
      },
    });
  }

  async findFormBySlug(slug: string): Promise<Form | null> {
    return this.findOne({
      where: { slug },
      relations: {
        categories: {
          questions: true,
        },
        admin: true,
      },
      order: {
        categories: { sortOrder: 'ASC' },
      },
    });
  }

  async findByAdminId(adminId: string): Promise<Form[]> {
    return await this.repository.find({
      where: { adminId },
      relations: ['categories', 'settings'],
    });
  }

  async findAllForms({
    skip = 0,
    take = 50,
    status,
    formType,
    adminId,
  }: {
    skip?: number;
    take?: number;
    status?: FormStatus;
    formType?: string;
    adminId?: string;
  } = {}): Promise<[Form[], number]> {
    const whereConditions: any = {};

    if (status) whereConditions.status = status;
    if (adminId) whereConditions.adminId = adminId;

    return this.findAndCount({
      where: whereConditions,
      relations: {
        categories: {
          questions: true,
        },
        admin: true,
      },
      order: { createdAt: 'DESC', categories: { sortOrder: 'ASC' } },
      skip,
      take,
    });
  }

  async getPublishedFormTypes(): Promise<FormType[]> {
    return await this.formTypeRepo
      .createQueryBuilder('formType')
      .leftJoinAndSelect('formType.forms', 'form')
      .where('formType.status = :status', { status: FormTypeStatus.ACTIVE })
      .andWhere('form.status = :formStatus', { formStatus: FormStatus.PUBLISHED })
      .getMany();
  }

  async getFormTypesByStatus(status: FormStatus): Promise<{ formType: string; count: number }[]> {
    const query = `
      SELECT 
        "formType" as "formType",
        COUNT(*) as count
      FROM forms 
      WHERE status = $1
      GROUP BY "formType"
      ORDER BY "formType"
    `;

    const result = await this.dataSource.query(query, [status]);
    return result.map((row: any) => ({
      formType: row.formType,
      count: parseInt(row.count, 10),
    }));
  }

  async getAllFormTypesCounts(): Promise<{ formType: string; count: number }[]> {
    const query = `
      SELECT 
        "formType" as "formType",
        COUNT(*) as count
      FROM forms 
      GROUP BY "formType"
      ORDER BY "formType"
    `;

    const result = await this.dataSource.query(query);
    return result.map((row: any) => ({
      formType: row.formType,
      count: parseInt(row.count, 10),
    }));
  }

  async getFormsByType(formType: string, status?: FormStatus): Promise<Form[]> {
    const queryBuilder = this.formRepository
      .createQueryBuilder('form')
      .leftJoinAndSelect('form.categories', 'category')
      .leftJoinAndSelect('category.questions', 'question')
      .leftJoinAndSelect('form.admin', 'admin')
      .where('form.formType = :formType', { formType })
      .orderBy('form.createdAt', 'DESC');

    if (status) {
      queryBuilder.andWhere('form.status = :status', { status });
    }

    return queryBuilder.getMany();
  }

  // Alternative method using TypeORM's built-in groupBy (if preferred)
  async getPublishedFormTypesWithTypeORM(): Promise<{ formType: string; count: number }[]> {
    console.log(formType, 'this is the form type');
    const result = await this.formRepository
      .createQueryBuilder('form')
      .select('form.formType', 'formType')
      .addSelect('COUNT(form.id)', 'count')
      .where('form.status = :status', { status: FormStatus.PUBLISHED })
      .groupBy('form.formType')
      .orderBy('form.formType')
      .getRawMany();

    return result.map((row: any) => ({
      formType: row.formType,
      count: parseInt(row.count, 10),
    }));
  }

  /* -------------------------------------------------- */
  /*  Category Management                               */
  /* -------------------------------------------------- */

  async addCategoryToForm(formId: string, categoryDto: CreateCategoryDto): Promise<Category> {
    const form = await this.findFormByIdOrFail(formId);

    const category = this.categoryRepo.create({
      name: categoryDto.name,
      slug: categoryDto.slug,
      sortOrder: categoryDto.sortOrder || 0,
      form: form,
    });

    const savedCategory = await this.categoryRepo.save(category);

    // Add questions if provided
    if (categoryDto.questions && categoryDto.questions.length > 0) {
      const questions = categoryDto.questions.map((q, index) =>
        this.questionRepo.create({
          ...q,
          sortOrder: q.sortOrder || index,
          category: savedCategory,
        })
      );
      await this.questionRepo.save(questions);
    }

    return this.categoryRepo.findOne({
      where: { id: savedCategory.id },
      relations: { questions: true },
      order: { questions: { sortOrder: 'ASC' } },
    }) as Promise<Category>;
  }

  async updateCategory(categoryId: string, updates: Partial<Category>): Promise<Category> {
    const category = await this.categoryRepo.findOneBy({ id: categoryId });
    if (!category) throw new Error('Category not found');

    Object.assign(category, updates);
    await this.categoryRepo.save(category);

    return this.categoryRepo.findOne({
      where: { id: categoryId },
      relations: { questions: true },
      order: { questions: { sortOrder: 'ASC' } },
    }) as Promise<Category>;
  }

  async deleteCategory(categoryId: string): Promise<void> {
    const result = await this.categoryRepo.delete(categoryId);
    if (result.affected === 0) throw new Error('Category not found');
  }

  /* -------------------------------------------------- */
  /*  Question Management                               */
  /* -------------------------------------------------- */

  async addQuestionToCategory(categoryId: string, questionDto: any): Promise<Question> {
    const category = await this.categoryRepo.findOneBy({ id: categoryId });
    if (!category) throw new Error('Category not found');

    const question = this.questionRepo.create({
      ...questionDto,
      category: category,
    });

    return this.questionRepo.save(question);
  }

  async updateQuestion(questionId: string, updates: Partial<Question>): Promise<Question> {
    const question = await this.questionRepo.findOneBy({ id: questionId });
    if (!question) throw new Error('Question not found');

    Object.assign(question, updates);
    return this.questionRepo.save(question);
  }

  async deleteQuestion(questionId: string): Promise<void> {
    const result = await this.questionRepo.delete(questionId);
    if (result.affected === 0) throw new Error('Question not found');
  }

  /* -------------------------------------------------- */
  /*  Dynamic Table Management                          */
  /* -------------------------------------------------- */

  async publishForm(formId: string): Promise<Form> {
    const form = await this.findFormByIdOrFail(formId);

    if (form.status === FormStatus.PUBLISHED) {
      throw new Error('Form is already published');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update form status
      form.status = FormStatus.PUBLISHED;
      form.publishedAt = new Date();

      // Generate table name if not exists
      if (!form.tableName) {
        form.tableName = this.generateTableName(form.slug);
      }

      await queryRunner.manager.save(Form, form);

      // Create dynamic table for submissions
      if (!form.tableCreated) {
        await this.createFormSubmissionTable(queryRunner, form);
        form.tableCreated = true;
        form.lastMigrationVersion = form.version;
        await queryRunner.manager.save(Form, form);
      }

      await queryRunner.commitTransaction();
      return (await this.findFormById(formId)) as Form;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async unpublishForm(formId: string): Promise<Form> {
    const form = await this.findFormByIdOrFail(formId);
    form.status = FormStatus.DRAFT;
    return this.save(form);
  }

  /* -------------------------------------------------- */
  /*  Additional Repository Methods                     */
  /* -------------------------------------------------- */

  async getSubmissionById(formId: string, submissionId: string): Promise<any | null> {
    const form = await this.findFormById(formId);
    if (!form?.tableName) throw new Error('Form table not found');

    const tableName = form.tableName;
    const sql = `SELECT * FROM "${tableName}" WHERE form_id = $1 AND id = $2`;
    const result = await this.dataSource.query(sql, [formId, submissionId]);

    return result.length > 0 ? result[0] : null;
  }

  async getSubmissionByMinigridSiteId(formId: string, siteId: string): Promise<any | null> {
    const form = await this.findFormById(formId);
    if (!form?.tableName) throw new Error('Form table not found');

    const tableName = form.tableName;
    const sql = `SELECT * FROM "${tableName}" WHERE form_id = $1 AND minigrid_siteId = $2`;
    const result = await this.dataSource.query(sql, [formId, siteId]);

    return result.length > 0 ? result[0] : null;
  }

  async updateSubmission(
    formId: string,
    submissionId: string,
    updates: Record<string, any>
  ): Promise<any> {
    const form = await this.findFormById(formId);
    if (!form?.tableName) throw new Error('Form table not found');

    const tableName = form.tableName;
    const setClauses: string[] = [];
    const params: any[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(updates)) {
      console.log(key, value, 'this is conso ine');
      if (key === 'id' || key === 'form_id' || key === 'submitted_at') continue;

      const col = key;
      setClauses.push(`"${col}" = $${idx}`);
      params.push(value); // driver infers type from JS value
      idx++;
    }

    if (setClauses.length === 0) {
      throw new Error('No valid fields to update');
    }

    setClauses.push(`"updated_at" = CURRENT_TIMESTAMP`);

    // WHERE clause uses the *next* two placeholders
    const sql = `
      UPDATE "${tableName}"
      SET ${setClauses.join(', ')}
      WHERE form_id = $${idx} AND id = $${idx + 1}
      RETURNING *
    `;

    params.push(formId, submissionId); // UUID strings → text/varchar
    const result = await this.dataSource.query(sql, params);

    if (result.length === 0) {
      throw new Error('Submission not found or update failed');
    }
    return result[0];
  }

  async deleteSubmission(formId: string, submissionId: string): Promise<void> {
    const form = await this.findFormById(formId);
    if (!form?.tableName) throw new Error('Form table not found');

    const tableName = form.tableName;
    const sql = `DELETE FROM "${tableName}" WHERE form_id = $1 AND id = $2`;
    const result = await this.dataSource.query(sql, [formId, submissionId]);

    if (result.length === 0) {
      throw new Error('Submission not found');
    }
  }

  async bulkDeleteSubmissions(formId: string, submissionIds: string[]): Promise<void> {
    const form = await this.findFormById(formId);
    if (!form?.tableName) throw new Error('Form table not found');

    const tableName = form.tableName;
    const placeholders = submissionIds.map((_, index) => `${index + 2}`).join(', ');
    const sql = `DELETE FROM "${tableName}" WHERE form_id = $1 AND id IN (${placeholders})`;

    await this.dataSource.query(sql, [formId, ...submissionIds]);
  }

  async bulkUpdateSubmissionStatus(
    formId: string,
    submissionIds: string[],
    status: string,
    reviewerId?: string
  ): Promise<void> {
    const form = await this.findFormById(formId);
    if (!form?.tableName) throw new Error('Form table not found');

    const tableName = form.tableName;
    const placeholders = submissionIds.map((_, index) => `${index + 3}`).join(', ');

    let sql = `
      UPDATE "${tableName}" 
      SET "status" = $1, "updated_at" = CURRENT_TIMESTAMP
    `;
    const params = [status];

    if (reviewerId) {
      sql += `, "reviewed_by" = $2`;
      params.push(reviewerId);
      sql += ` WHERE form_id = $3 AND id IN (${placeholders})`;
      params.push(formId, ...submissionIds);
    } else {
      sql += ` WHERE form_id = $2 AND id IN (${placeholders})`;
      params.push(formId, ...submissionIds);
    }

    await this.dataSource.query(sql, params);
  }

  async getFormStatistics(formId: string): Promise<any> {
    const form = await this.findFormById(formId);
    if (!form?.tableName) {
      return {
        totalSubmissions: 0,
        statusDistribution: {},
        submissionsByDate: [],
        averageCompletionTime: 0,
      };
    }

    const tableName = form.tableName;

    // Get total submissions
    const totalResult = await this.dataSource.query(
      `SELECT COUNT(*) as total FROM "${tableName}" WHERE form_id = $1`,
      [formId]
    );

    // Get status distribution
    const statusResult = await this.dataSource.query(
      `SELECT status, COUNT(*) as count FROM "${tableName}" WHERE form_id = $1 GROUP BY status`,
      [formId]
    );

    // Get submissions by date (last 30 days)
    const dateResult = await this.dataSource.query(
      `
      SELECT 
        DATE(submitted_at) as date,
        COUNT(*) as count
      FROM "${tableName}" 
      WHERE form_id = $1 
        AND submitted_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(submitted_at)
      ORDER BY date ASC
    `,
      [formId]
    );

    return {
      totalSubmissions: parseInt(totalResult[0].total),
      statusDistribution: statusResult.reduce((acc: any, row: any) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {}),
      submissionsByDate: dateResult.map((row: any) => ({
        date: row.date,
        count: parseInt(row.count),
      })),
      averageCompletionTime: 0, // Would need additional tracking to calculate this
    };
  }

  async exportFormSubmissions(formId: string, submissionIds?: string[]): Promise<any[]> {
    const form = await this.findFormById(formId);
    if (!form?.tableName) throw new Error('Form table not found');

    const tableName = form.tableName;
    let sql = `SELECT * FROM "${tableName}" WHERE form_id = $1`;
    const params = [formId];

    if (submissionIds && submissionIds.length > 0) {
      const placeholders = submissionIds.map((_, index) => `${index + 2}`).join(', ');
      sql += ` AND id IN (${placeholders})`;
      params.push(...submissionIds);
    }

    sql += ` ORDER BY submitted_at DESC`;

    return this.dataSource.query(sql, params);
  }

  async checkTableHealth(formId: string): Promise<any> {
    const form = await this.findFormById(formId);
    if (!form) throw new Error('Form not found');

    const health = {
      formId,
      tableName: form.tableName,
      tableExists: false,
      schemaMatches: false,
      submissionCount: 0,
      issues: [] as string[],
    };

    if (!form.tableName || !form.tableCreated) {
      health.issues.push('No submission table created');
      return health;
    }

    try {
      // Check if table exists
      const tableExistsResult = await this.dataSource.query(
        `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `,
        [form.tableName]
      );

      health.tableExists = tableExistsResult[0].exists;

      if (health.tableExists) {
        // Get submission count
        const countResult = await this.dataSource.query(
          `SELECT COUNT(*) as count FROM "${form.tableName}"`,
          []
        );
        health.submissionCount = parseInt(countResult[0].count);

        // Check schema matches (basic check)
        const columnsResult = await this.dataSource.query(
          `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_name = $1 AND table_schema = 'public'
          ORDER BY ordinal_position
        `,
          [form.tableName]
        );

        // Validate expected columns exist
        const expectedColumns = ['id', 'form_id', 'submitted_by', 'submitted_at', 'status'];
        const actualColumns = columnsResult.map((col: any) => col.column_name);

        const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
        if (missingColumns.length > 0) {
          health.issues.push(`Missing columns: ${missingColumns.join(', ')}`);
        }

        // Check for form-specific columns
        for (const category of form.categories) {
          for (const question of category.questions) {
            const columnName = question.slug;
            if (!actualColumns.includes(columnName)) {
              health.issues.push(`Missing question column: ${columnName}`);
            }
          }
        }

        health.schemaMatches = health.issues.length === 0;
      } else {
        health.issues.push('Submission table does not exist');
      }
    } catch (error) {
      health.issues.push(`Error checking table health: ${error.message}`);
    }

    return health;
  }

  async repairFormTable(formId: string): Promise<{
    success: boolean;
    tableName: string;
    message: string;
    issuesRepaired: string[];
  }> {
    const form = await this.findFormByIdOrFail(formId);
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    const issuesRepaired: string[] = [];

    try {
      // Generate table name if it doesn't exist
      if (!form.tableName) {
        form.tableName = form.slug;
        issuesRepaired.push(`Generated table name: ${form.tableName}`);
      }

      const tableName = form.tableName;

      // Check if table actually exists in the database
      const tableExistsResult = await queryRunner.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [tableName]
      );

      const tableExists = tableExistsResult[0].exists;

      if (!tableExists) {
        // Table doesn't exist - create it from scratch
        await this.createFormSubmissionTable(queryRunner, form);
        form.tableCreated = true;
        issuesRepaired.push(`Created missing table: ${tableName}`);
      } else {
        // Table exists - check and repair schema
        // 1. Fetch current columns in the DB
        const dbCols = await queryRunner.query(
          `SELECT column_name
           FROM information_schema.columns
          WHERE table_name = $1 AND table_schema = 'public'`,
          [tableName]
        );
        const existing = new Set(dbCols.map((c: any) => c.column_name));

        // 2. Ensure base columns exist
        const baseColumns = [
          {
            name: 'id',
            type: 'UUID',
            nullable: false,
            default: 'gen_random_uuid()',
            isPrimaryKey: true,
          },
          {
            name: 'form_id',
            type: 'UUID',
            nullable: false,
            references: 'forms(id)',
            onDelete: 'CASCADE',
          },
          {
            name: 'submitted_by',
            type: 'UUID',
            nullable: true,
            references: 'members(id)',
            onDelete: 'SET NULL',
          },
          {
            name: 'minigrid_siteId',
            type: 'UUID',
            nullable: true,
            references: 'minigrid_sites(id)',
            onDelete: 'SET NULL',
          },
          { name: 'submitted_at', type: 'TIMESTAMP', nullable: true, default: 'CURRENT_TIMESTAMP' },
          { name: 'status', type: 'VARCHAR(20)', nullable: true, default: "'SUBMITTED'" },

          // Admin review fields
          { name: 'admin_status', type: 'VARCHAR(20)', nullable: true, default: "'PENDING'" },
          { name: 'admin_comment', type: 'TEXT', nullable: true, default: 'NULL' },
          {
            name: 'reviewed_by',
            type: 'UUID',
            nullable: true,
            references: 'users(id)',
            onDelete: 'SET NULL',
          },
          { name: 'reviewed_at', type: 'TIMESTAMP', nullable: true, default: 'NULL' },

          { name: 'created_at', type: 'TIMESTAMP', nullable: true, default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'TIMESTAMP', nullable: true, default: 'CURRENT_TIMESTAMP' },
        ];

        for (const baseCol of baseColumns) {
          if (!existing.has(baseCol.name)) {
            let alterSQL = `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${baseCol.name}" ${baseCol.type}`;

            if (!baseCol.nullable) {
              // For NOT NULL columns, add as nullable first, then set default, then make NOT NULL
              await queryRunner.query(`${alterSQL} NULL`);

              if (baseCol.default) {
                await queryRunner.query(
                  `UPDATE "${tableName}" SET "${baseCol.name}" = ${baseCol.default} WHERE "${baseCol.name}" IS NULL`
                );
              }

              await queryRunner.query(
                `ALTER TABLE "${tableName}" ALTER COLUMN "${baseCol.name}" SET NOT NULL`
              );
            } else {
              if (baseCol.default) {
                alterSQL += ` DEFAULT ${baseCol.default}`;
              }
              await queryRunner.query(alterSQL);
            }

            // Add foreign key constraint if specified
            if (baseCol.references) {
              const constraintName = `fk_${tableName}_${baseCol.name}`;
              const onDelete = baseCol.onDelete || 'RESTRICT';

              await queryRunner.query(
                `ALTER TABLE "${tableName}" 
                 ADD CONSTRAINT "${constraintName}" 
                 FOREIGN KEY ("${baseCol.name}") 
                 REFERENCES ${baseCol.references} 
                 ON DELETE ${onDelete}`
              );
              issuesRepaired.push(`Added foreign key constraint: ${constraintName}`);
            }

            // Add primary key constraint if specified
            if (baseCol.isPrimaryKey) {
              await queryRunner.query(
                `ALTER TABLE "${tableName}" ADD PRIMARY KEY ("${baseCol.name}")`
              );
              issuesRepaired.push(`Added primary key constraint on: ${baseCol.name}`);
            }

            issuesRepaired.push(`Added missing base column: ${baseCol.name}`);
          }
        }

        // 3. Add question columns
        for (const cat of form.categories) {
          for (const q of cat.questions) {
            const colName = q.slug;
            if (!existing.has(colName)) {
              const sqlType = this.getPostgreSQLType(q.type);

              // Add the column as nullable so existing rows are valid
              await queryRunner.query(
                `ALTER TABLE "${tableName}"
                 ADD COLUMN IF NOT EXISTS "${colName}" ${sqlType} NULL`
              );

              // Back-fill with a sensible default
              let defaultVal = 'NULL';
              switch (q.type) {
                case 'number':
                case 'currency':
                  defaultVal = '0';
                  break;
                case 'text':
                case 'email':
                case 'textarea':
                  defaultVal = "''";
                  break;
                case 'boolean':
                  defaultVal = 'false';
                  break;
                case 'multiselect':
                  defaultVal = "'[]'::jsonb";
                  break;
              }

              if (defaultVal !== 'NULL') {
                await queryRunner.query(
                  `UPDATE "${tableName}" SET "${colName}" = ${defaultVal} WHERE "${colName}" IS NULL`
                );
              }

              // Make it NOT NULL if the question requires it
              if (q.required) {
                await queryRunner.query(
                  `ALTER TABLE "${tableName}"
                   ALTER COLUMN "${colName}" SET NOT NULL`
                );
              }

              issuesRepaired.push(`Added question column: ${colName}`);
            }
          }
        }

        // 4. Check and repair foreign key constraints
        await this.checkAndRepairForeignKeys(queryRunner, tableName, issuesRepaired);

        // 6. Ensure indexes exist
        const indexPrefix = tableName.replace(/-/g, '_');
        const expectedIndexes = [
          { name: `idx_${indexPrefix}_form_id`, column: 'form_id' },
          { name: `idx_${indexPrefix}_submitted_by`, column: 'submitted_by' },
          { name: `idx_${indexPrefix}_minigrid_siteId`, column: 'minigrid_siteId' },
          { name: `idx_${indexPrefix}_submitted_at`, column: 'submitted_at' },
          { name: `idx_${indexPrefix}_status`, column: 'status' },
          { name: `idx_${indexPrefix}_admin_status`, column: 'admin_status' },
          { name: `idx_${indexPrefix}_reviewed_by`, column: 'reviewed_by' },
        ];

        for (const idx of expectedIndexes) {
          // Check if index exists
          const indexExists = await queryRunner.query(
            `SELECT EXISTS (
              SELECT FROM pg_indexes 
              WHERE tablename = $1 AND indexname = $2
            )`,
            [tableName, idx.name]
          );

          if (!indexExists[0].exists) {
            await queryRunner.query(
              `CREATE INDEX IF NOT EXISTS "${idx.name}" ON "${tableName}"("${idx.column}")`
            );
            issuesRepaired.push(`Created missing index: ${idx.name}`);
          }
        }

        // Mark table as created if it wasn't marked before
        if (!form.tableCreated) {
          form.tableCreated = true;
          issuesRepaired.push('Marked table as created in form metadata');
        }
      }

      // Update form metadata
      form.lastMigrationVersion = form.version;
      await queryRunner.manager.save(Form, form);
      await queryRunner.commitTransaction();

      return {
        success: true,
        tableName: form.tableName,
        message:
          issuesRepaired.length > 0
            ? 'Form table repaired successfully'
            : 'Form table was already in good condition',
        issuesRepaired,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new Error(`Failed to repair form table: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  async updateSubmissionAdminReview(
    formId: string,
    submissionId: string,
    adminStatus: 'PENDING' | 'APPROVED' | 'REJECTED',
    adminComment?: string,
    reviewerId?: string
  ): Promise<any> {
    const form = await this.findFormById(formId);
    if (!form?.tableName) throw new Error('Form table not found');

    const tableName = form.tableName;
    const updates: Record<string, any> = {
      admin_status: adminStatus,
      reviewed_at: new Date(),
    };

    if (adminComment !== undefined) {
      updates.admin_comment = adminComment;
    }

    if (reviewerId) {
      updates.reviewed_by = reviewerId;
    }

    return this.updateSubmission(formId, submissionId, updates);
  }

  /**
   * Check and repair foreign key constraints for a form submission table
   */
  private async checkAndRepairForeignKeys(
    queryRunner: QueryRunner,
    tableName: string,
    issuesRepaired: string[]
  ): Promise<void> {
    // Define expected foreign key constraints
    const expectedConstraints = [
      {
        name: `fk_${tableName}_form_id`,
        column: 'form_id',
        references: 'forms(id)',
        onDelete: 'CASCADE',
      },
      {
        name: `fk_${tableName}_submitted_by`,
        column: 'submitted_by',
        references: 'members(id)',
        onDelete: 'SET NULL',
      },

      {
        name: `fk_${tableName}_minigrid_siteId`,
        column: 'minigrid_siteId',
        references: 'minigrid_sites(id)',
        onDelete: 'SET NULL',
      },
    ];

    for (const constraint of expectedConstraints) {
      // Check if constraint exists
      const constraintExists = await queryRunner.query(
        `SELECT EXISTS (
        SELECT FROM information_schema.table_constraints 
        WHERE table_name = $1 
        AND constraint_name = $2 
        AND constraint_type = 'FOREIGN KEY'
      )`,
        [tableName, constraint.name]
      );

      if (!constraintExists[0].exists) {
        try {
          // Add missing foreign key constraint
          await queryRunner.query(
            `ALTER TABLE "${tableName}" 
           ADD CONSTRAINT "${constraint.name}" 
           FOREIGN KEY ("${constraint.column}") 
           REFERENCES ${constraint.references} 
           ON DELETE ${constraint.onDelete}`
          );
          issuesRepaired.push(`Added foreign key constraint: ${constraint.name}`);
        } catch (error) {
          // If constraint fails, it might be due to orphaned data
          console.warn(`Failed to add constraint ${constraint.name}: ${error.message}`);

          // Clean up orphaned records if necessary
          if (constraint.column === 'form_id') {
            const orphanedRecords = await queryRunner.query(
              `DELETE FROM "${tableName}" 
             WHERE "${constraint.column}" NOT IN (SELECT id FROM forms)`
            );
            if (orphanedRecords.length > 0) {
              issuesRepaired.push(`Removed ${orphanedRecords.length} orphaned form submissions`);
            }
          } else if (constraint.column === 'submitted_by') {
            // For user references, just set to NULL for orphaned records
            await queryRunner.query(
              `UPDATE "${tableName}" 
              SET "${constraint.column}" = NULL 
              WHERE "${constraint.column}" IS NOT NULL 
                AND "${constraint.column}" NOT IN (SELECT id FROM members)`
            );
            issuesRepaired.push(`Cleaned up orphaned user references in ${constraint.column}`);
          }

          // Try adding constraint again after cleanup
          try {
            await queryRunner.query(
              `ALTER TABLE "${tableName}" 
             ADD CONSTRAINT "${constraint.name}" 
             FOREIGN KEY ("${constraint.column}") 
             REFERENCES ${constraint.references} 
             ON DELETE ${constraint.onDelete}`
            );
            issuesRepaired.push(`Added foreign key constraint after cleanup: ${constraint.name}`);
          } catch (retryError) {
            issuesRepaired.push(
              `Warning: Could not add constraint ${constraint.name}: ${retryError.message}`
            );
          }
        }
      }
    }
  }

  /* -------------------------------------------------- */
  /*  Form Submission Data Management                   */
  /* -------------------------------------------------- */

  async submitFormData(
    formId: string,
    submissionData: Record<string, any>,
    submittedBy?: string
  ): Promise<any> {
    const form = await this.findFormById(formId);

    if (!form) throw new Error('Form not found');
    if (form.status !== FormStatus.PUBLISHED) throw new Error('Form is not published');
    if (!form.tableCreated || !form.tableName) throw new Error('Form table not created');

    const tableName = form.tableName;
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();

      // Prepare insertion data
      const insertData: Record<string, any> = {
        form_id: formId,
        submitted_by: submittedBy,
        submitted_at: new Date(),
        status: 'SUBMITTED',
        minigrid_siteId: submissionData?.minigrid_siteId,
      };

      // Map form data to table columns
      for (const category of form.categories) {
        for (const question of category.questions) {
          const columnName = question.slug;
          const value = submissionData[question.slug];

          if (value !== undefined) {
            insertData[columnName] = value;
          }
        }
      }

      // Build and execute INSERT
      const columns = Object.keys(insertData)
        .map(col => `"${col}"`)
        .join(', ');
      const values = Object.values(insertData);
      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

      const insertSQL = `INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders}) RETURNING id`;
      const result = await queryRunner.query(insertSQL, values);

      return { id: result[0].id, ...insertData };
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Helper method to extract form answers from the row data
   */
  private extractFormAnswers(row: any, form: Form): Record<string, any> {
    const answers: Record<string, any> = {};

    // Get all the form question columns and their values
    for (const category of form.categories) {
      for (const question of category.questions) {
        const columnName = question.slug;
        if (row[columnName] !== undefined) {
          answers[question.slug] = row[columnName];
        }
      }
    }

    return answers;
  }

  async getMemberAllSubmissions(memberId: string): Promise<any[]> {
    // Get all published forms
    const [publishedForms] = await this.findAllForms({
      status: FormStatus.PUBLISHED,
    });

    const allSubmissions: any[] = [];
    // const tableName = form.tableName;
    //     let sql = `SELECT * FROM "${tableName}" WHERE form_id = $1`;
    //     const params = [formId];

    // Query each form's submission table for this member's data
    for (const form of publishedForms) {
      if (!form.tableCreated || !form.tableName) continue;

      try {
        const submissions = await this.getFormSubmissions(
          form.id,
          { submitted_by: memberId },
          undefined,
          true
        );

        allSubmissions.push(...submissions);
      } catch (error) {
        console.error(`Error fetching submissions for form ${form.id}:`, error);
        // Continue with other forms
      }
    }

    // Sort by submission date (newest first)
    allSubmissions.sort(
      (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
    );

    return allSubmissions;
  }
  async getFormSubmissions(
    formId: string,
    filters?: Record<string, any>,
    pagination?: { page: number; limit: number },
    populate = false
  ): Promise<any[]> {
    const form = await this.findFormById(formId);

    if (!form?.tableName) throw new Error('Form table not found');

    const tableName = form.tableName;

    let sql: string;
    const params: any[] = [formId];

    if (populate) {
      // Build the SELECT clause to include all question columns
      const questionColumns = this.getQuestionColumns(form);

      sql = `
      SELECT 
        s.*,
        ${questionColumns}
        -- Form data
        f.id as form_data_id,
        f.title as form_title,
        f.slug as form_slug,
        f.description as form_description,
        f.status as form_status,
        f."admin_id" as form_admin_id,
        f."formTypeId" as form_form_type_id,
        -- Form Type data
        ft.id as form_type_id,
        ft.name as form_type_name,
        ft.slug as form_type_slug,
        ft.description as form_type_description,
        ft.year as form_type_year,
        ft.status as form_type_status,
        ft.color as form_type_color,
        ft.icon as form_type_icon,
        ft."sortOrder" as form_type_sort_order,
        ft."isPublic" as form_type_is_public,
        ft."isDefault" as form_type_is_default,
        -- User data (submitted_by)
        u.id as submitted_by_id,
        u."companyName" as submitted_by_name,
        u."primaryContactEmail" as submitted_by_contact_email,
        u."memberId" as submitted_by_member_id,
        -- Admin data (form creator)
        admin.id as admin_user_id,
        admin.email as admin_email,
        admin."firstName" as admin_first_name,
        admin."lastName" as admin_last_name,
        -- Minigrid Site Information
        ms.id as minigrid_site_id,
        ms.name as minigrid_site_name,
        ms."siteId" as site_id
      FROM "${tableName}" s
      LEFT JOIN forms f ON s.form_id = f.id
      LEFT JOIN form_types ft ON f."formTypeId" = ft.id
      LEFT JOIN members u ON s.submitted_by = u.id
      LEFT JOIN users admin ON f."admin_id" = admin.id
      LEFT JOIN minigrid_sites ms ON s."minigrid_siteId" = ms.id
      WHERE s.form_id = $1
    `;
    } else {
      // Simple query without population - but include ALL columns
      sql = `SELECT * FROM "${tableName}" WHERE form_id = $1`;
    }

    // Add filters if provided
    if (filters) {
      let paramIndex = params.length + 1;
      for (const [key, value] of Object.entries(filters)) {
        const columnName = key;

        if (populate) {
          // When populating, prefix with table alias
          sql += ` AND s."${columnName}" = $${paramIndex}`;
        } else {
          sql += ` AND "${columnName}" = $${paramIndex}`;
        }

        params.push(value);
        paramIndex++;
      }
    }

    if (populate) {
      sql += ` ORDER BY s.submitted_at DESC`;
    } else {
      sql += ` ORDER BY submitted_at DESC`;
    }

    // Add pagination
    if (pagination) {
      const offset = (pagination.page - 1) * pagination.limit;
      sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(pagination.limit, offset);
    }

    const results = await this.dataSource.query(sql, params);

    // Transform results when populated to have nested objects
    if (populate) {
      return results.map((row: any) => ({
        // Submission data
        id: row.id,
        form_id: row.form_id,
        submitted_by: row.submitted_by,
        submitted_at: row.submitted_at,
        status: row.status,
        admin_status: row.admin_status,
        admin_comment: row.admin_comment,
        reviewed_by: row.reviewed_by,
        reviewed_at: row.reviewed_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
        minigrid_siteId: row.minigrid_siteId,

        // Extract form question answers (dynamic columns)
        ...this.extractFormAnswers(row, form),

        // Populated form data
        form: row.form_data_id
          ? {
              id: row.form_data_id,
              title: row.form_title,
              slug: row.form_slug,
              description: row.form_description,
              status: row.form_status,
              adminId: row.form_admin_id,
              formTypeId: row.form_form_type_id,
              admin: row.admin_user_id
                ? {
                    id: row.admin_user_id,
                    email: row.admin_email,
                    firstName: row.admin_first_name,
                    lastName: row.admin_last_name,
                    fullName: `${row.admin_first_name || ''} ${row.admin_last_name || ''}`.trim(),
                  }
                : null,
              // Nested formType data
              formType: row.form_type_id
                ? {
                    id: row.form_type_id,
                    name: row.form_type_name,
                    slug: row.form_type_slug,
                    description: row.form_type_description,
                    year: row.form_type_year,
                    status: row.form_type_status,
                    color: row.form_type_color,
                    icon: row.form_type_icon,
                    sortOrder: row.form_type_sort_order,
                    isPublic: row.form_type_is_public,
                    isDefault: row.form_type_is_default,
                  }
                : null,
            }
          : null,

        // Populated user data
        submittedBy: row.submitted_by_id
          ? {
              id: row.submitted_by_id,
              email: row.submitted_by_contact_email,
              name: row.submitted_by_name,
              memberId: row.submitted_by_member_id,
            }
          : null,

        // Populated minigrid site data
        minigridSite: row.minigrid_site_id
          ? {
              id: row.minigrid_site_id,
              name: row.minigrid_site_name,
              siteId: row.site_id,
            }
          : null,
      }));
    }

    // When not populating, still extract the answers properly
    return results.map((row: any) => ({
      ...row,
      answers: this.extractFormAnswers(row, form),
    }));
  }

  /**
   * Fixed implementation using TypeORM instead of raw SQL
   * This approach is cleaner and avoids column naming issues
   */

  async getAdminDashboardOverview(filters?: {
    dateFrom?: Date;
    dateTo?: Date;
    formType?: string;
    adminId?: string;
  }): Promise<{
    summary: {
      totalForms: number;
      publishedForms: number;
      draftForms: number;
      archivedForms: number;
      totalSubmissions: number;
      pendingReviews: number;
      approvedSubmissions: number;
      rejectedSubmissions: number;
      totalMembers: number;
      activeMembersThisMonth: number;
    };
    formTypeBreakdown: Array<{
      formTypeId: string;
      formTypeName: string;
      formTypeSlug: string;
      totalForms: number;
      publishedForms: number;
      totalSubmissions: number;
      pendingReviews: number;
      recentActivity: Date | null;
    }>;
    recentActivity: {
      recentSubmissions: Array<any>;
      recentlyPublishedForms: Array<any>;
      pendingReviews: Array<any>;
    };
    submissionTrends: {
      daily: Array<{ date: string; count: number }>;
      weekly: Array<{ week: string; count: number }>;
      monthly: Array<{ month: string; count: number }>;
    };
    memberActivity: {
      topSubmitters: Array<any>;
      inactiveMembers: Array<any>;
    };
    formPerformance: Array<any>;
    systemHealth: {
      formsWithIssues: number;
      orphanedSubmissions: number;
      duplicateSubmissions: number;
      missingTables: number;
      schemaMismatches: number;
    };
  }> {
    // ============================================================================
    // 1. TRY CACHE FIRST (5 minute TTL for dashboard data)
    // ============================================================================
    const cacheKey = `dashboard:overview:${JSON.stringify(filters || {})}`;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        console.log('✅ Dashboard cache hit');
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('⚠️ Redis cache read failed, continuing without cache:', error);
    }

    // ============================================================================
    // 2. SETUP DATE FILTERS
    // ============================================================================
    const dateFrom = filters?.dateFrom || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const dateTo = filters?.dateTo || new Date();

    // ============================================================================
    // 3. PARALLEL QUERY EXECUTION - Phase 1: Base Data
    // ============================================================================
    const [allForms, allFormTypes] = await Promise.all([
      // Query forms with minimal data (don't load relations yet)
      this.createQueryBuilder('form')
        .select([
          'form.id',
          'form.title',
          'form.slug',
          'form.status',
          'form.tableCreated',
          'form.tableName',
          'form.formTypeId',
          // 'form.publishedAt',
          // 'form.totalViews',
          // 'form.averageCompletionTime',
          'form.createdAt',
        ])
        .leftJoin('form.formType', 'formType')
        .addSelect(['formType.id', 'formType.name', 'formType.slug'])
        .where(filters?.formType ? 'form.formTypeId = :formTypeId' : '1=1', {
          formTypeId: filters?.formType,
        })
        .andWhere(filters?.adminId ? 'form.adminId = :adminId' : '1=1', {
          adminId: filters?.adminId,
        })
        .getMany(),

      // Get all form types
      this.formTypeRepo.find({
        select: ['id', 'name', 'slug'],
      }),
    ]);

    // ============================================================================
    // 4. CALCULATE FORM STATISTICS (In-Memory - Fast)
    // ============================================================================
    const publishedForms = allForms.filter(f => f.status === FormStatus.PUBLISHED);
    const draftForms = allForms.filter(f => f.status === FormStatus.DRAFT);
    const archivedForms = allForms.filter(f => f.status === FormStatus.ARCHIVED);
    const formsWithTables = publishedForms.filter(f => f.tableCreated && f.tableName);

    // ============================================================================
    // 5. PARALLEL QUERY EXECUTION - Phase 2: Submission Data (CRITICAL OPTIMIZATION)
    // ============================================================================
    const submissionStatsPromises = formsWithTables.map(async form => {
      try {
        // Execute all queries for this form in parallel
        const [stats, members, activeMembers] = await Promise.all([
          // Main stats query - optimized with single pass
          this.dataSource.query(
            `
          SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE admin_status = 'PENDING') as pending,
            COUNT(*) FILTER (WHERE admin_status = 'APPROVED') as approved,
            COUNT(*) FILTER (WHERE admin_status = 'REJECTED') as rejected,
            MAX(submitted_at) as last_submission
          FROM "${form.tableName}"
          WHERE submitted_at BETWEEN $1 AND $2
        `,
            [dateFrom, dateTo]
          ),

          // Unique members in date range
          this.dataSource.query(
            `
          SELECT DISTINCT submitted_by 
          FROM "${form.tableName}"
          WHERE submitted_by IS NOT NULL 
            AND submitted_at BETWEEN $1 AND $2
        `,
            [dateFrom, dateTo]
          ),

          // Active members (last 30 days)
          this.dataSource.query(`
          SELECT DISTINCT submitted_by 
          FROM "${form.tableName}"
          WHERE submitted_by IS NOT NULL 
            AND submitted_at >= CURRENT_DATE - INTERVAL '30 days'
        `),
        ]);

        return {
          form,
          stats: stats[0],
          members: members.map(m => m.submitted_by).filter(Boolean),
          activeMembers: activeMembers.map(m => m.submitted_by).filter(Boolean),
        };
      } catch (error) {
        console.error(`❌ Error querying form ${form.id} (${form.tableName}):`, error.message);
        return null;
      }
    });

    // Wait for all submission queries to complete
    const submissionResults = (await Promise.all(submissionStatsPromises)).filter(Boolean);

    // ============================================================================
    // 6. AGGREGATE SUBMISSION STATISTICS
    // ============================================================================
    let totalSubmissions = 0;
    let pendingReviews = 0;
    let approvedSubmissions = 0;
    let rejectedSubmissions = 0;
    const uniqueMembers = new Set<string>();
    const activeMembersThisMonth = new Set<string>();
    const formTypeStats = new Map<
      string,
      {
        formTypeId: string;
        formTypeName: string;
        formTypeSlug: string;
        totalForms: number;
        publishedForms: number;
        totalSubmissions: number;
        pendingReviews: number;
        recentActivity: Date | null;
      }
    >();

    // Process all submission results
    for (const result of submissionResults) {
      if (!result) continue;

      const { form, stats, members, activeMembers } = result;

      // Aggregate totals
      const formSubmissions = parseInt(stats.total || '0');
      const formPending = parseInt(stats.pending || '0');

      totalSubmissions += formSubmissions;
      pendingReviews += formPending;
      approvedSubmissions += parseInt(stats.approved || '0');
      rejectedSubmissions += parseInt(stats.rejected || '0');

      // Track unique members
      members.forEach(m => uniqueMembers.add(m));
      activeMembers.forEach(m => activeMembersThisMonth.add(m));

      // Aggregate by form type
      const formTypeId = form.formTypeId;
      if (formTypeId) {
        const existing = formTypeStats.get(formTypeId) || {
          formTypeId: formTypeId,
          formTypeName: form.formType?.name || 'Unknown',
          formTypeSlug: form.formType?.slug || 'unknown',
          totalForms: 0,
          publishedForms: 0,
          totalSubmissions: 0,
          pendingReviews: 0,
          recentActivity: null as Date | null,
        };

        existing.totalSubmissions += formSubmissions;
        existing.pendingReviews += formPending;
        existing.totalForms += 1;
        existing.publishedForms += 1;

        if (stats.last_submission) {
          const lastSubmission = new Date(stats.last_submission);
          if (!existing.recentActivity || lastSubmission > existing.recentActivity) {
            existing.recentActivity = lastSubmission;
          }
        }

        formTypeStats.set(formTypeId, existing);
      }
    }

    // ============================================================================
    // 7. BUILD FORM TYPE BREAKDOWN
    // ============================================================================
    const formTypeResultsMap = new Map<string, any>();

    // Get form counts per type (without submission data)
    for (const form of allForms) {
      if (!form.formTypeId) continue;

      const existing = formTypeResultsMap.get(form.formTypeId) || {
        formTypeId: form.formTypeId,
        formTypeName: form.formType?.name || 'Unknown',
        formTypeSlug: form.formType?.slug || 'unknown',
        totalForms: 0,
        publishedForms: 0,
        recentActivity: null,
      };

      existing.totalForms += 1;
      if (form.status === FormStatus.PUBLISHED) {
        existing.publishedForms += 1;

        if (form.publishedAt) {
          const publishedDate = new Date(form.publishedAt);
          if (!existing.recentActivity || publishedDate > existing.recentActivity) {
            existing.recentActivity = publishedDate;
          }
        }
      }

      formTypeResultsMap.set(form.formTypeId, existing);
    }

    // Merge with submission stats - include ALL form types
    const formTypeBreakdown = allFormTypes
      .map(formType => {
        const formData = formTypeResultsMap.get(formType.id);
        const stats = formTypeStats.get(formType.id);

        return {
          formTypeId: formType.id,
          formTypeName: formType.name,
          formTypeSlug: formType.slug,
          totalForms: formData?.totalForms || 0,
          publishedForms: formData?.publishedForms || 0,
          totalSubmissions: stats?.totalSubmissions || 0,
          pendingReviews: stats?.pendingReviews || 0,
          recentActivity: stats?.recentActivity || formData?.recentActivity || null,
        };
      })
      .filter(ft => {
        // If filters are applied, only show form types that match the filter
        if (filters?.formType) {
          return ft.formTypeId === filters.formType;
        }
        return true;
      })
      .sort((a, b) => b.totalForms - a.totalForms);

    // ============================================================================
    // 8. PARALLEL QUERY EXECUTION - Phase 3: Additional Metrics
    // ============================================================================
    const [
      recentSubmissions,
      recentlyPublishedForms,
      pendingReviewsList,
      submissionTrends,
      memberActivity,
      formPerformance,
      systemHealth,
    ] = await Promise.all([
      this.getRecentSubmissionsAcrossAllForms(10, dateFrom, dateTo, formsWithTables),
      this.getRecentlyPublishedForms(5, publishedForms),
      this.getPendingReviewSubmissions(10, formsWithTables),
      this.getSubmissionTrends(dateFrom, dateTo, formsWithTables),
      this.getMemberActivityStats(dateFrom, dateTo, formsWithTables),
      this.getFormPerformanceMetrics(filters, publishedForms),
      this.getSystemHealthMetrics(publishedForms),
    ]);

    // ============================================================================
    // 9. BUILD FINAL RESPONSE
    // ============================================================================
    const dashboardData = {
      summary: {
        totalForms: allForms.length,
        publishedForms: publishedForms.length,
        draftForms: draftForms.length,
        archivedForms: archivedForms.length,
        totalSubmissions,
        pendingReviews,
        approvedSubmissions,
        rejectedSubmissions,
        totalMembers: uniqueMembers.size,
        activeMembersThisMonth: activeMembersThisMonth.size,
      },
      formTypeBreakdown,
      recentActivity: {
        recentSubmissions,
        recentlyPublishedForms,
        pendingReviews: pendingReviewsList,
      },
      submissionTrends,
      memberActivity,
      formPerformance,
      systemHealth,
    };

    // ============================================================================
    // 10. CACHE THE RESULT (5 minutes TTL)
    // ============================================================================
    try {
      await redisClient.setEx(cacheKey, 300, JSON.stringify(dashboardData));
      console.log('✅ Dashboard data cached successfully');
    } catch (error) {
      console.warn('⚠️ Failed to cache dashboard data:', error);
    }

    return dashboardData;
  }
  /**
   * Helper: Get recent submissions across all forms
   */
  private async getRecentSubmissionsAcrossAllForms(
    limit: number,
    dateFrom: Date,
    dateTo: Date,
    formsWithTables: Form[]
  ): Promise<any[]> {
    // Query all forms in parallel
    const submissionPromises = formsWithTables.map(async form => {
      if (!form.tableName) return [];

      try {
        const query = `
        SELECT 
          s.id,
          s.form_id,
          s.submitted_by,
          s.submitted_at,
          s.status,
          s.admin_status,
          m."companyName" as member_name
        FROM "${form.tableName}" s
        LEFT JOIN members m ON s.submitted_by = m.id
        WHERE s.submitted_at BETWEEN $1 AND $2
        ORDER BY s.submitted_at DESC
        LIMIT $3
      `;

        const submissions = await this.dataSource.query(query, [dateFrom, dateTo, limit]);

        return submissions.map((sub: any) => ({
          id: sub.id,
          formId: form.id,
          formTitle: form.title,
          formType: form.formType?.name || 'Unknown',
          submittedBy: sub.submitted_by,
          memberName: sub.member_name || 'Unknown',
          submittedAt: sub.submitted_at,
          status: sub.status,
          adminStatus: sub.admin_status,
        }));
      } catch (error) {
        console.error(`Error fetching submissions for form ${form.id}:`, error);
        return [];
      }
    });

    const allSubmissions = (await Promise.all(submissionPromises)).flat();

    return allSubmissions
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .slice(0, limit);
  }

  /**
   * Helper: Get recently published forms
   */
  private async getRecentlyPublishedForms(limit: number, publishedForms: Form[]): Promise<any[]> {
    // // Sort by publishedAt in memory (faster than DB query)
    // const sortedForms = publishedForms.sort((a, b) => new Date(b.publishedAt!).getTime() - new Date(a.publishedAt!).getTime())
    //   .slice(0, limit);

    // Get submission counts in parallel
    const formDataPromises = publishedForms.map(async form => {
      let submissionCount = 0;

      if (form.tableCreated && form.tableName) {
        try {
          const countQuery = `SELECT COUNT(*) as count FROM "${form.tableName}"`;
          const countResult = await this.dataSource.query(countQuery);
          submissionCount = parseInt(countResult[0]?.count || '0');
        } catch (error) {
          console.error(`Error counting submissions for form ${form.id}:`, error);
        }
      }

      return {
        id: form.id,
        title: form.title,
        formType: form.formType?.name || 'Unknown',
        // publishedAt: form.publishedAt,
        submissionCount,
      };
    });

    return Promise.all(formDataPromises);
  }

  /**
   * Helper: Get pending review submissions
   */
  private async getPendingReviewSubmissions(
    limit: number,
    formsWithTables: Form[]
  ): Promise<any[]> {
    const pendingPromises = formsWithTables.map(async form => {
      if (!form.tableName) return [];

      try {
        const query = `
        SELECT 
          s.id,
          s.form_id,
          s.submitted_by,
          s.submitted_at,
          m."companyName" as member_name,
          EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - s.submitted_at)) / 3600 as waiting_hours
        FROM "${form.tableName}" s
        LEFT JOIN members m ON s.submitted_by = m.id
        WHERE s.admin_status = 'PENDING'
        ORDER BY s.submitted_at ASC
        LIMIT $1
      `;

        const submissions = await this.dataSource.query(query, [limit]);

        return submissions.map((sub: any) => ({
          id: sub.id,
          formId: form.id,
          formTitle: form.title,
          formType: form.formType?.name || 'Unknown',
          submittedBy: sub.submitted_by,
          memberName: sub.member_name || 'Unknown',
          submittedAt: sub.submitted_at,
          waitingTime: Math.round(parseFloat(sub.waiting_hours)),
        }));
      } catch (error) {
        console.error(`Error fetching pending for form ${form.id}:`, error);
        return [];
      }
    });

    const allPending = (await Promise.all(pendingPromises)).flat();

    return allPending
      .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())
      .slice(0, limit);
  }

  /**
   * Helper: Get submission trends
   */
  private async getSubmissionTrends(
    dateFrom: Date,
    dateTo: Date,
    formsWithTables: Form[]
  ): Promise<{
    daily: Array<{ date: string; count: number }>;
    weekly: Array<{ week: string; count: number }>;
    monthly: Array<{ month: string; count: number }>;
  }> {
    const dailyCounts: Record<string, number> = {};
    const weeklyCounts: Record<string, number> = {};
    const monthlyCounts: Record<string, number> = {};

    // Query all forms in parallel
    const trendPromises = formsWithTables.map(async form => {
      if (!form.tableName) return { daily: {}, weekly: {}, monthly: {} };

      try {
        const query = `
        SELECT 
          DATE(submitted_at) as date,
          TO_CHAR(submitted_at, 'IYYY-IW') as week,
          TO_CHAR(submitted_at, 'YYYY-MM') as month,
          COUNT(*) as count
        FROM "${form.tableName}"
        WHERE submitted_at BETWEEN $1 AND $2
        GROUP BY DATE(submitted_at), TO_CHAR(submitted_at, 'IYYY-IW'), TO_CHAR(submitted_at, 'YYYY-MM')
      `;

        const results = await this.dataSource.query(query, [dateFrom, dateTo]);

        const daily: Record<string, number> = {};
        const weekly: Record<string, number> = {};
        const monthly: Record<string, number> = {};

        results.forEach((row: any) => {
          const dateStr = row.date.toISOString().split('T')[0];
          daily[dateStr] = (daily[dateStr] || 0) + parseInt(row.count);
          weekly[row.week] = (weekly[row.week] || 0) + parseInt(row.count);
          monthly[row.month] = (monthly[row.month] || 0) + parseInt(row.count);
        });

        return { daily, weekly, monthly };
      } catch (error) {
        console.error(`Error fetching trends for form ${form.id}:`, error);
        return { daily: {}, weekly: {}, monthly: {} };
      }
    });

    // Aggregate all results
    const allTrends = await Promise.all(trendPromises);

    allTrends.forEach(({ daily, weekly, monthly }) => {
      Object.entries(daily).forEach(([date, count]) => {
        dailyCounts[date] = (dailyCounts[date] || 0) + count;
      });
      Object.entries(weekly).forEach(([week, count]) => {
        weeklyCounts[week] = (weeklyCounts[week] || 0) + count;
      });
      Object.entries(monthly).forEach(([month, count]) => {
        monthlyCounts[month] = (monthlyCounts[month] || 0) + count;
      });
    });

    return {
      daily: Object.entries(dailyCounts)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      weekly: Object.entries(weeklyCounts)
        .map(([week, count]) => ({ week, count }))
        .sort((a, b) => a.week.localeCompare(b.week)),
      monthly: Object.entries(monthlyCounts)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month)),
    };
  }

  /**
   * Helper: Get member activity statistics
   */
  private async getMemberActivityStats(
    dateFrom: Date,
    dateTo: Date,
    formsWithTables: Form[]
  ): Promise<{
    topSubmitters: any[];
    inactiveMembers: any[];
  }> {
    // Aggregate member submissions across all forms
    const memberSubmissions = new Map<string, { count: number; lastSubmission: Date }>();

    const memberPromises = formsWithTables.map(async form => {
      if (!form.tableName) return [];

      try {
        const query = `
        SELECT 
          submitted_by,
          COUNT(*) as count,
          MAX(submitted_at) as last_submission
        FROM "${form.tableName}"
        WHERE submitted_by IS NOT NULL
          AND submitted_at BETWEEN $1 AND $2
        GROUP BY submitted_by
      `;

        return this.dataSource.query(query, [dateFrom, dateTo]);
      } catch (error) {
        console.error(`Error fetching member activity for form ${form.id}:`, error);
        return [];
      }
    });

    const allMemberData = (await Promise.all(memberPromises)).flat();

    allMemberData.forEach((row: any) => {
      const existing = memberSubmissions.get(row.submitted_by) || {
        count: 0,
        lastSubmission: new Date(0),
      };

      existing.count += parseInt(row.count);
      const lastSub = new Date(row.last_submission);
      if (lastSub > existing.lastSubmission) {
        existing.lastSubmission = lastSub;
      }

      memberSubmissions.set(row.submitted_by, existing);
    });

    // Get top submitters
    const topSubmitters = Array.from(memberSubmissions.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([memberId, data]) => ({
        memberId,
        submissionCount: data.count,
        lastSubmission: data.lastSubmission,
      }));

    return {
      topSubmitters,
      inactiveMembers: [], // Implement if needed
    };
  }

  /**
   * Helper: Get form performance metrics
   */
  private async getFormPerformanceMetrics(filters: any, publishedForms: Form[]): Promise<any[]> {
    const performancePromises = publishedForms.map(async form => {
      let totalSubmissions = 0;
      let lastSubmission = null;

      if (form.tableCreated && form.tableName) {
        try {
          const statsQuery = `
          SELECT 
            COUNT(*) as total,
            MAX(submitted_at) as last_submission
          FROM "${form.tableName}"
        `;
          const stats = await this.dataSource.query(statsQuery);
          totalSubmissions = parseInt(stats[0]?.total || '0');
          lastSubmission = stats[0]?.last_submission;
        } catch (error) {
          console.error(`Error fetching stats for form ${form.id}:`, error);
        }
      }

      return {
        formId: form.id,
        formTitle: form.title,
        formType: form.formType?.name || 'Unknown',
        status: form.status,
        totalSubmissions,
        completionRate: form.totalViews > 0 ? (totalSubmissions / form.totalViews) * 100 : 0,
        averageTimeToSubmit: form.averageCompletionTime || 0,
        lastSubmission,
      };
    });

    const performance = await Promise.all(performancePromises);

    return performance.sort((a, b) => b.totalSubmissions - a.totalSubmissions);
  }

  /**
   * Helper: Get system health metrics
   */
  private async getSystemHealthMetrics(publishedForms: Form[]): Promise<{
    formsWithIssues: number;
    orphanedSubmissions: number;
    duplicateSubmissions: number;
    missingTables: number;
    schemaMismatches: number;
  }> {
    let missingTables = 0;

    // Quick check: just count forms without tables
    missingTables = publishedForms.filter(f => !f.tableCreated || !f.tableName).length;

    return {
      formsWithIssues: missingTables,
      orphanedSubmissions: 0, // Implement if needed
      duplicateSubmissions: 0, // Implement if needed
      missingTables,
      schemaMismatches: 0, // Implement if needed (expensive operation)
    };
  }

  private getQuestionColumns(form: Form): string {
    const columns: string[] = [];

    for (const category of form.categories) {
      for (const question of category.questions) {
        const columnName = question.slug;
        columns.push(`s."${columnName}" as "${columnName}"`);
      }
    }

    return columns.length > 0 ? columns.join(',\n        ') + ',\n        ' : '';
  }

  /* -------------------------------------------------- */
  /*  Helper methods                                    */
  /* -------------------------------------------------- */

  private async createCategoriesWithQuestions(
    queryRunner: QueryRunner,
    form: Form,
    categoriesData: CreateCategoryDto[]
  ): Promise<void> {
    for (const categoryData of categoriesData) {
      const category = this.categoryRepo.create({
        name: categoryData.name,
        slug: categoryData.slug,
        sortOrder: categoryData.sortOrder || 0,
        form: form,
      });

      const savedCategory = await queryRunner.manager.save(Category, category);

      if (categoryData.questions && categoryData.questions.length > 0) {
        const questions = categoryData.questions.map((q, index) =>
          this.questionRepo.create({
            ...q,
            sortOrder: q.sortOrder || index,
            category: savedCategory,
          })
        );

        await queryRunner.manager.save(Question, questions);
      }
    }
  }

  private async createFormSubmissionTable(queryRunner: QueryRunner, form: Form): Promise<void> {
    const tableName = form.tableName!;

    let sql = `CREATE TABLE "${tableName}" (\n`;
    sql += `  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
    sql += `  "form_id" UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,\n`;
    sql += `  "submitted_by" UUID REFERENCES members(id) ON DELETE SET NULL,\n`; // Members submit forms
    sql += `  "minigrid_siteId" UUID REFERENCES minigrid_sites(id) ON DELETE SET NULL,\n`;
    sql += `  "submitted_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n`;
    sql += `  "status" VARCHAR(20) DEFAULT 'SUBMITTED',\n`;

    sql += `  "admin_status" VARCHAR(20) DEFAULT 'PENDING' CHECK (admin_status IN ('PENDING', 'APPROVED', 'REJECTED')),\n`;
    sql += `  "admin_comment" TEXT NULL,\n`;
    sql += `  "reviewed_by" UUID REFERENCES users(id) ON DELETE SET NULL,\n`; // Admins (users) review forms
    sql += `  "reviewed_at" TIMESTAMP NULL,\n`;

    // Add columns for each question
    for (const category of form.categories) {
      for (const question of category.questions) {
        const columnName = question.slug;
        const columnType = this.getPostgreSQLType(question.type);
        const nullable = question.required ? 'NOT NULL' : 'NULL';

        sql += `  "${columnName}" ${columnType} ${nullable},\n`;
      }
    }

    sql += `  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n`;
    sql += `  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
    sql += `);`;

    await queryRunner.query(sql);

    // Create indexes
    const indexPrefix = tableName.replace(/-/g, '_');
    const indexes = [
      `CREATE INDEX "idx_${indexPrefix}_form_id" ON "${tableName}"("form_id");`,
      `CREATE INDEX "idx_${indexPrefix}_submitted_by" ON "${tableName}"("submitted_by");`,
      `CREATE INDEX "idx_${indexPrefix}_minigrid_siteId" ON "${tableName}"("minigrid_siteId");`,
      `CREATE INDEX "idx_${indexPrefix}_submitted_at" ON "${tableName}"("submitted_at");`,
      `CREATE INDEX "idx_${indexPrefix}_status" ON "${tableName}"("status");`,
      `CREATE INDEX "idx_${indexPrefix}_admin_status" ON "${tableName}"("admin_status");`,
      `CREATE INDEX "idx_${indexPrefix}_reviewed_by" ON "${tableName}"("reviewed_by");`,
    ];

    for (const indexSQL of indexes) {
      await queryRunner.query(indexSQL);
    }
  }
  private generateTableName(slug: string): string {
    return `${slug.replace(/-/g, '_')}_submissions`;
  }

  private getPostgreSQLType(questionType: string): string {
    const typeMap: Record<string, string> = {
      text: 'TEXT',
      textarea: 'TEXT',
      number: 'DECIMAL',
      currency: 'DECIMAL(15,2)',
      date: 'DATE',
      datetime: 'TIMESTAMP',
      boolean: 'BOOLEAN',
      select: 'VARCHAR(255)',
      multiselect: 'JSONB',
      file: 'TEXT',
      email: 'VARCHAR(255)',
      phone: 'VARCHAR(20)',
      url: 'TEXT',
    };

    return typeMap[questionType] || 'TEXT';
  }

  private sanitizeColumnName(slug: string): string {
    return slug
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');
  }

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
