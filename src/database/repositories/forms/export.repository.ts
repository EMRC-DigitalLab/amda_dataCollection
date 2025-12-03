// @ts-nocheck
import { DataSource, Repository } from 'typeorm';
import {
  ExportFilters,
  IExportRepository,
} from '../../../modules/forms/interfaces/export.interface';
import { FormType } from '../../entities/form-type.entity';
import { Form } from '../../entities/form.entity';
import { Member } from '../../entities/member.entity';
import { MinigridSite } from '../../entities/minigrid-site.entity';

export class ExportRepository implements IExportRepository {
  private formRepo: Repository<Form>;
  private formTypeRepo: Repository<FormType>;
  private memberRepo: Repository<Member>;
  private siteRepo: Repository<MinigridSite>;

  constructor(private dataSource: DataSource) {
    this.formRepo = dataSource.getRepository(Form);
    this.formTypeRepo = dataSource.getRepository(FormType);
    this.memberRepo = dataSource.getRepository(Member);
    this.siteRepo = dataSource.getRepository(MinigridSite);
  }

  async getFormSubmissionsByFormType(
    formTypeId: string,
    year?: number,
    memberId?: string,
    siteId?: string
  ): Promise<any[]> {
    const queryBuilder = this.formRepo
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.formType', 'ft')
      .leftJoinAndSelect('f.categories', 'categories')
      .leftJoinAndSelect('categories.questions', 'questions')
      .where('f.formTypeId = :formTypeId', { formTypeId })
      .andWhere('f.tableCreated = :tableCreated', { tableCreated: true })
      .andWhere('f.tableName IS NOT NULL')
      .orderBy('categories.sortOrder', 'ASC')
      .addOrderBy('questions.sortOrder', 'ASC');

    if (year) {
      queryBuilder.andWhere('ft.year = :year', { year });
    }

    const forms = await queryBuilder.getMany();
    const allSubmissions: any[] = [];

    for (const form of forms) {
      if (!form.tableName) continue;

      try {
        const tableExists = await this.checkTableExists(form.tableName);
        if (!tableExists) continue;

        const dynamicColumns = this.buildColumnList(form);

        let query = `
          SELECT 
            s.id, s.form_id, s.submitted_by, s."minigrid_siteId",
            s.submitted_at, s.status, s.admin_status, s.admin_comment,
            s.reviewed_by, s.reviewed_at, s.created_at, s.updated_at,
            ${dynamicColumns.map(col => `s."${col}"`).join(', ')},
            $1::text as form_title,
            $2::text as form_slug,
            $3::text as form_type_name,
            $4::integer as form_year,
            m."companyName" as member_company,
            m.email as member_email,
            m."memberId" as member_id_code,
            ms.name as site_name,
            ms."siteId" as site_id_code,
            ms.country as site_country,
            ms.region as site_region
          FROM "${form.tableName}" s
          LEFT JOIN members m ON m.id = s.submitted_by
          LEFT JOIN minigrid_sites ms ON ms.id = s."minigrid_siteId"
          WHERE 1=1
        `;

        const params: any[] = [
          form.title,
          form.slug,
          form.formType?.name || 'Unknown',
          form.formType?.year || null,
        ];
        let paramCount = 4;

        if (memberId) {
          paramCount++;
          query += ` AND s.submitted_by = $${paramCount}`;
          params.push(memberId);
        }

        if (siteId) {
          paramCount++;
          query += ` AND s."minigrid_siteId" = $${paramCount}`;
          params.push(siteId);
        }

        query += ` ORDER BY s.created_at DESC`;

        const submissions = await this.dataSource.query(query, params);
        allSubmissions.push(...submissions);
      } catch (error) {
        console.error(`Error querying form ${form.title}:`, error.message);
      }
    }

    return allSubmissions;
  }

  async getFormSubmissionsByMember(
    memberId: string,
    year?: number,
    formTypeId?: string
  ): Promise<any[]> {
    let formQuery = this.formRepo
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.formType', 'ft')
      .leftJoinAndSelect('f.categories', 'categories')
      .leftJoinAndSelect('categories.questions', 'questions')
      .where('f.tableCreated = :tableCreated', { tableCreated: true })
      .andWhere('f.tableName IS NOT NULL')
      .orderBy('categories.sortOrder', 'ASC')
      .addOrderBy('questions.sortOrder', 'ASC');

    if (formTypeId) {
      formQuery = formQuery.andWhere('f.formTypeId = :formTypeId', { formTypeId });
    }

    if (year) {
      formQuery = formQuery.andWhere('ft.year = :year', { year });
    }

    const forms = await formQuery.getMany();
    const allSubmissions: any[] = [];

    for (const form of forms) {
      if (!form.tableName) continue;

      try {
        const tableExists = await this.checkTableExists(form.tableName);
        if (!tableExists) continue;

        const dynamicColumns = this.buildColumnList(form);

        const query = `
          SELECT 
            s.*, ${dynamicColumns.map(col => `s."${col}"`).join(', ')},
            $1::text as form_title, $2::text as form_slug,
            $3::text as form_type_name, $4::integer as form_year,
            m."companyName" as member_company, m.email as member_email,
            ms.name as site_name, ms."siteId" as site_id_code
          FROM "${form.tableName}" s
          LEFT JOIN members m ON m.id = s.submitted_by
          LEFT JOIN minigrid_sites ms ON ms.id = s."minigrid_siteId"
          WHERE s.submitted_by = $5
          ORDER BY s.created_at DESC
        `;

        const submissions = await this.dataSource.query(query, [
          form.title,
          form.slug,
          form.formType?.name || 'Unknown',
          form.formType?.year || null,
          memberId,
        ]);

        allSubmissions.push(...submissions);
      } catch (error) {
        console.error(`Error querying form ${form.title}:`, error.message);
      }
    }

    return allSubmissions;
  }

  async getFormSubmissionsBySite(
    siteId: string,
    year?: number,
    formTypeId?: string
  ): Promise<any[]> {
    let formQuery = this.formRepo
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.formType', 'ft')
      .leftJoinAndSelect('f.categories', 'categories')
      .leftJoinAndSelect('categories.questions', 'questions')
      .where('f.tableCreated = :tableCreated', { tableCreated: true })
      .andWhere('f.tableName IS NOT NULL')
      .orderBy('categories.sortOrder', 'ASC')
      .addOrderBy('questions.sortOrder', 'ASC');

    if (formTypeId) {
      formQuery = formQuery.andWhere('f.formTypeId = :formTypeId', { formTypeId });
    }

    if (year) {
      formQuery = formQuery.andWhere('ft.year = :year', { year });
    }

    const forms = await formQuery.getMany();
    const allSubmissions: any[] = [];

    for (const form of forms) {
      if (!form.tableName) continue;

      try {
        const tableExists = await this.checkTableExists(form.tableName);
        if (!tableExists) continue;

        const dynamicColumns = this.buildColumnList(form);

        const query = `
          SELECT 
            s.*, ${dynamicColumns.map(col => `s."${col}"`).join(', ')},
            $1::text as form_title, $2::text as form_slug,
            $3::text as form_type_name, $4::integer as form_year,
            m."companyName" as member_company, m.email as member_email,
            ms.name as site_name, ms."siteId" as site_id_code, ms.country as site_country
          FROM "${form.tableName}" s
          LEFT JOIN members m ON m.id = s.submitted_by
          LEFT JOIN minigrid_sites ms ON ms.id = s."minigrid_siteId"
          WHERE s."minigrid_siteId" = $5
          ORDER BY s.created_at DESC
        `;

        const submissions = await this.dataSource.query(query, [
          form.title,
          form.slug,
          form.formType?.name || 'Unknown',
          form.formType?.year || null,
          siteId,
        ]);

        allSubmissions.push(...submissions);
      } catch (error) {
        console.error(`Error querying form ${form.title}:`, error.message);
      }
    }

    return allSubmissions;
  }

  async getAllFormSubmissions(
    year?: number,
    formTypeId?: string,
    memberId?: string,
    siteId?: string
  ): Promise<any[]> {
    let formQuery = this.formRepo
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.formType', 'ft')
      .leftJoinAndSelect('f.categories', 'categories')
      .leftJoinAndSelect('categories.questions', 'questions')
      .where('f.tableCreated = :tableCreated', { tableCreated: true })
      .andWhere('f.tableName IS NOT NULL')
      .orderBy('categories.sortOrder', 'ASC')
      .addOrderBy('questions.sortOrder', 'ASC');

    if (formTypeId) {
      formQuery = formQuery.andWhere('f.formTypeId = :formTypeId', { formTypeId });
    }

    if (year) {
      formQuery = formQuery.andWhere('ft.year = :year', { year });
    }

    const forms = await formQuery.getMany();
    const allSubmissions: any[] = [];

    for (const form of forms) {
      if (!form.tableName) continue;

      try {
        const tableExists = await this.checkTableExists(form.tableName);
        if (!tableExists) continue;

        const dynamicColumns = this.buildColumnList(form);

        let query = `
          SELECT 
            s.*, ${dynamicColumns.map(col => `s."${col}"`).join(', ')},
            $1::text as form_title, $2::text as form_slug,
            $3::text as form_type_name, $4::integer as form_year,
            m."companyName" as member_company, m.email as member_email,
            ms.name as site_name, ms."siteId" as site_id_code, ms.country as site_country
          FROM "${form.tableName}" s
          LEFT JOIN members m ON m.id = s.submitted_by
          LEFT JOIN minigrid_sites ms ON ms.id = s."minigrid_siteId"
          WHERE 1=1
        `;

        const params: any[] = [
          form.title,
          form.slug,
          form.formType?.name || 'Unknown',
          form.formType?.year || null,
        ];
        let paramCount = 4;

        if (memberId) {
          paramCount++;
          query += ` AND s.submitted_by = $${paramCount}`;
          params.push(memberId);
        }

        if (siteId) {
          paramCount++;
          query += ` AND s."minigrid_siteId" = $${paramCount}`;
          params.push(siteId);
        }

        query += ` ORDER BY s.created_at DESC`;

        const submissions = await this.dataSource.query(query, params);
        allSubmissions.push(...submissions);
      } catch (error) {
        console.error(`Error querying form ${form.title}:`, error.message);
      }
    }

    return allSubmissions;
  }

  private async checkTableExists(tableName: string): Promise<boolean> {
    try {
      const result = await this.dataSource.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        )`,
        [tableName]
      );
      return result[0].exists;
    } catch (error) {
      return false;
    }
  }

  private buildColumnList(form: Form): string[] {
    const columns: string[] = [];
    const reservedColumns = new Set([
      'id',
      'form_id',
      'submitted_by',
      'minigrid_siteId',
      'country',
      'submitted_at',
      'status',
      'admin_status',
      'admin_comment',
      'reviewed_by',
      'reviewed_at',
      'created_at',
      'updated_at',
    ]);

    if (form.categories) {
      for (const category of form.categories) {
        if (category.questions) {
          for (const question of category.questions) {
            if (!reservedColumns.has(question.slug)) {
              columns.push(question.slug);
            }
          }
        }
      }
    }

    return columns;
  }

  async getFormTypesByYear(year?: number): Promise<any[]> {
    let query = this.formTypeRepo
      .createQueryBuilder('ft')
      .leftJoinAndSelect('ft.forms', 'f')
      .orderBy('ft.name', 'ASC');

    if (year) {
      query = query.where('ft.year = :year', { year });
    }

    return query.getMany();
  }

  async getMembersByStatus(status?: string): Promise<any[]> {
    let query = this.memberRepo
      .createQueryBuilder('m')
      .select([
        'm.id',
        'm.companyName',
        'm.email',
        'm.membershipStatus',
        'm.membershipType',
        'm.createdAt',
      ])
      .orderBy('m.companyName', 'ASC');

    if (status) {
      query = query.where('m.membershipStatus = :status', { status });
    }

    return query.getMany();
  }

  async getSitesByMember(memberId?: string): Promise<any[]> {
    let query = this.siteRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.member', 'm')
      .select([
        's.id',
        's.siteId',
        's.name',
        's.country',
        's.region',
        's.district',
        's.village',
        's.status',
        's.createdAt',
        'm.id',
        'm.companyName',
      ])
      .orderBy('s.name', 'ASC');

    if (memberId) {
      query = query.where('s.memberUuid = :memberId', { memberId });
    }

    return query.getMany();
  }

  async getExportSummary(filters: ExportFilters): Promise<any> {
    const submissions = await this.getAllFormSubmissions(
      filters.year,
      filters.formTypeId,
      filters.memberId,
      filters.siteId
    );

    const summary = {
      totalRecords: submissions.length,
      formTypes: [...new Set(submissions.map(s => s.form_type_name).filter(Boolean))],
      memberCount: new Set(submissions.map(s => s.submitted_by).filter(Boolean)).size,
      siteCount: new Set(submissions.map(s => s.minigrid_siteId).filter(Boolean)).size,
      dateRange: { earliest: null, latest: null },
    };

    if (submissions.length > 0) {
      const dates = submissions.map(s => new Date(s.created_at)).filter(d => !isNaN(d.getTime()));
      if (dates.length > 0) {
        summary.dateRange.earliest = new Date(Math.min(...dates.map(d => d.getTime())));
        summary.dateRange.latest = new Date(Math.max(...dates.map(d => d.getTime())));
      }
    }

    return summary;
  }
}
