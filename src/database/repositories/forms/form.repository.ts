// @ts-nocheck
import { Injectable } from 'injection-js';
import { DataSource, QueryRunner, Repository } from 'typeorm';

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

    try {
      // Update form basic info
      Object.assign(form, {
        title: changes.title ?? form.title,
        slug: changes.slug ?? form.slug,
        description: changes.description ?? form.description,
        status: changes.status ?? form.status,
        formTypeId: changes.formTypeId ?? form.formTypeId,
      });

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
    const sql = `SELECT * FROM "${tableName}" WHERE form_id = $1 AND "minigrid_siteId" = $2`;
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

    if (populate) {
      // SQL with JOINs to populate related data
      sql = `
        SELECT 
          s.*,
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
      // Simple query without population
      sql = `SELECT * FROM "${tableName}" WHERE form_id = $1`;
    }

    const params: any[] = [formId];

    // Add filters if provided
    if (filters) {
      let paramIndex = 2;
      for (const [key, value] of Object.entries(filters)) {
        // Sanitize column name for security
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

    return results;
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
    sql += `  "submitted_by" UUID REFERENCES members(id) ON DELETE SET NULL,\n`;
    sql += `  "minigrid_siteId" UUID REFERENCES minigrid_sites(id) ON DELETE SET NULL,\n`;
    sql += `  "submitted_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n`;
    sql += `  "status" VARCHAR(20) DEFAULT 'SUBMITTED',\n`;

    sql += `  "admin_status" VARCHAR(20) DEFAULT 'PENDING' CHECK (admin_status IN ('PENDING', 'APPROVED', 'REJECTED')),\n`;
    sql += `  "admin_comment" TEXT NULL,\n`;
    sql += `  "reviewed_by" UUID REFERENCES users(id) ON DELETE SET NULL,\n`;
    sql += `  "reviewed_at" TIMESTAMP NULL,\n`;

    // Reserved column names
    const reservedColumns = [
      'id',
      'form_id',
      'submitted_by',
      'minigrid_siteId',
      'submitted_at',
      'status',
      'admin_status',
      'admin_comment',
      'reviewed_by',
      'reviewed_at',
      'created_at',
      'updated_at',
    ];

    // Add columns for each question
    for (const category of form.categories) {
      for (const question of category.questions) {
        const columnName = question.slug;

        // Skip reserved column names
        if (reservedColumns.includes(columnName)) {
          continue;
        }

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
