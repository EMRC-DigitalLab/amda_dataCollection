import { Injectable } from 'injection-js';
import { DataSource } from 'typeorm';
import { Form } from '../../../database/entities/form.entity';

@Injectable()
export class FormSettingsService {
  constructor(private dataSource: DataSource) {}

  /**
   * Create a dynamic table based on form schema
   */
  async createFormTable(form: Form): Promise<void> {
    const tableName = form.generateTableName();
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // Build CREATE TABLE SQL based on form structure
      const createTableSQL = await this.buildCreateTableSQL(form, tableName);

      // Execute table creation
      await queryRunner.query(createTableSQL);

      // Create indexes for better performance
      await this.createTableIndexes(queryRunner, tableName);

      // Update form record
      await queryRunner.manager.update(Form, form.id, {
        tableCreated: true,
        tableName: tableName,
        lastMigrationVersion: form.version,
      });

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Update existing table when form schema changes
   */
  async updateFormTable(form: Form): Promise<void> {
    const tableName = form.tableName!;
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // Get current table structure
      const currentColumns = await queryRunner.query(
        `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
      `,
        [tableName]
      );

      // Generate ALTER TABLE statements
      const alterStatements = await this.buildAlterTableSQL(form, tableName, currentColumns);

      // Execute alterations
      for (const sql of alterStatements) {
        await queryRunner.query(sql);
      }

      // Update migration version
      await queryRunner.manager.update(Form, form.id, {
        lastMigrationVersion: form.version,
      });

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Build CREATE TABLE SQL from form schema
   */
  private async buildCreateTableSQL(form: Form, tableName: string): Promise<string> {
    await form.categories;

    let sql = `CREATE TABLE "${tableName}" (\n`;
    sql += `  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
    sql += `  "form_id" UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,\n`;
    sql += `  "submitted_by" UUID REFERENCES users(id) ON DELETE SET NULL,\n`;
    sql += `  "submitted_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n`;
    sql += `  "minigrid_siteId" UUID REFERENCES minigrid_sites(id) ON DELETE SET NULL,\n`;
    sql += `  "status" VARCHAR(20) DEFAULT 'SUBMITTED',\n`;

    // Add columns for each question
    for (const category of form.categories) {
      for (const question of category.questions) {
        const columnName = this.sanitizeColumnName(question.slug);
        const columnType = this.getPostgreSQLType(question.type);
        const nullable = question.required ? 'NOT NULL' : 'NULL';

        sql += `  "${columnName}" ${columnType} ${nullable},\n`;
      }
    }

    sql += `  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n`;
    sql += `  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
    sql += `);`;

    return sql;
  }

  /**
   * Build ALTER TABLE statements for schema changes
   */
  private async buildAlterTableSQL(
    form: Form,
    tableName: string,
    currentColumns: any[]
  ): Promise<string[]> {
    const statements: string[] = [];
    const existingColumns = new Set(currentColumns.map(col => col.column_name));

    await form.categories; // Load categories with questions

    // Add new columns
    for (const category of form.categories) {
      for (const question of category.questions) {
        const columnName = this.sanitizeColumnName(question.slug);

        if (!existingColumns.has(columnName)) {
          const columnType = this.getPostgreSQLType(question.type);
          const nullable = question.required ? "NOT NULL DEFAULT ''" : 'NULL';

          statements.push(
            `ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${columnType} ${nullable};`
          );
        }
      }
    }

    return statements;
  }

  /**
   * Create indexes for better query performance
   */
  private async createTableIndexes(queryRunner: any, tableName: string): Promise<void> {
    const indexes = [
      `CREATE INDEX "idx_${tableName}_form_id" ON "${tableName}"("form_id");`,
      `CREATE INDEX "idx_${tableName}_submitted_by" ON "${tableName}"("submitted_by");`,
      `CREATE INDEX "idx_${tableName}_submitted_at" ON "${tableName}"("submitted_at");`,
      `CREATE INDEX "idx_${tableName}_status" ON "${tableName}"("status");`,
    ];

    for (const indexSQL of indexes) {
      await queryRunner.query(indexSQL);
    }
  }

  /**
   * Map question types to PostgreSQL types
   */
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
      file: 'TEXT', // Store file URLs/paths
      email: 'VARCHAR(255)',
      phone: 'VARCHAR(20)',
      url: 'TEXT',
    };

    return typeMap[questionType] || 'TEXT';
  }

  /**
   * Sanitize column names for PostgreSQL
   */
  private sanitizeColumnName(slug: string): string {
    return slug
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Insert form submission data
   */
  async submitFormData(
    formId: string,
    submissionData: Record<string, any>,
    submittedBy?: string
  ): Promise<void> {
    const form = await this.dataSource.getRepository(Form).findOne({
      where: { id: formId },
      relations: ['categories', 'categories.questions'],
    });

    if (!form || !form.tableCreated) {
      throw new Error('Form table not found or not created');
    }

    const tableName = form.tableName!;
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();P

      // Prepare data for insertion
      const insertData: Record<string, any> = {
        form_id: formId,
        submitted_by: submittedBy,
        submitted_at: new Date(),
        status: 'SUBMITTED',
      };

      // Map submission data to table columns
      for (const category of form.categories) {
        for (const question of category.questions) {
          const columnName = this.sanitizeColumnName(question.slug);
          const value = submissionData[question.slug];

          if (value !== undefined) {
            insertData[columnName] = value;
          }
        }
      }

      // Build and execute INSERT statement
      const columns = Object.keys(insertData)
        .map(col => `"${col}"`)
        .join(', ');
      const values = Object.values(insertData);
      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

      const insertSQL = `INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders})`;
      await queryRunner.query(insertSQL, values);
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Query form submission data
   */
  async getFormSubmissions(
    formId: string,
    filters?: Record<string, any>,
    pagination?: { page: number; limit: number }
  ): Promise<any[]> {
    const form = await this.dataSource.getRepository(Form).findOneBy({ id: formId });

    if (!form?.tableName) {
      throw new Error('Form table not found');
    }

    const tableName = form.tableName;
    let sql = `SELECT * FROM "${tableName}" WHERE form_id = $1`;
    const params: any[] = [formId];

    // Add filters if provided
    if (filters) {
      let paramIndex = 2;
      for (const [key, value] of Object.entries(filters)) {
        const columnName = this.sanitizeColumnName(key);
        sql += ` AND "${columnName}" = $${paramIndex}`;
        params.push(value);
        paramIndex++;
      }
    }

    // Add pagination
    if (pagination) {
      const offset = (pagination.page - 1) * pagination.limit;
      sql += ` ORDER BY submitted_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(pagination.limit, offset);
    }

    return await this.dataSource.query(sql, params);
  }
}
