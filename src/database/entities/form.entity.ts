// form.entity.ts - This is the SCHEMA definition
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Category } from './category.entity';
import { User } from './user.entity';

export enum FormStatus {
  DRAFT = 'DRAFT', // Form is being designed
  PUBLISHED = 'PUBLISHED', // Form is live and ready for submissions
  ARCHIVED = 'ARCHIVED', // Form is no longer active
}

export enum FormType {
  FINANCE = 'FINANCE',
  PROJECT = 'PROJECT',
  ASSESSMENT = 'ASSESSMENT',
  SURVEY = 'SURVEY',
  CUSTOM = 'CUSTOM',
  ORGANIZATION="ORGANIZATION"
}

@Entity({ name: 'forms' })
export class Form extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  title!: string; // e.g., "Finance Report Form", "Project Assessment Form"

  @Column({ type: 'varchar', length: 100, unique: true })
  slug!: string; // e.g., "finance-report", "project-assessment"

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: FormType,
    default: FormType.CUSTOM,
  })
  formType!: FormType;

  @Column({
    type: 'enum',
    enum: FormStatus,
    default: FormStatus.DRAFT,
  })
  status!: FormStatus;

  @Column({
    name: 'version',
    type: 'varchar',
    length: 10,
    default: '1.0.0',
  })
  version!: string;

  // This will store the actual table name that gets created dynamically
  @Column({
    name: 'table_name',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  tableName?: string; // e.g., "finance_report_submissions", "project_assessment_data"

  @Column({
    name: 'date_started',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  dateStarted!: Date;

  @Column({
    name: 'admin_id',
    type: 'uuid',
  })
  adminId!: string;

  @Column({ type: 'uuid', nullable: true })
  parentId?: string;

  // Track if the database table has been created for this form
  @Column({
    name: 'table_created',
    type: 'boolean',
    default: false,
  })
  tableCreated!: boolean;

  // Store the last migration version applied to this form's table
  @Column({
    name: 'last_migration_version',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  lastMigrationVersion?: string;

  /* Relations -------------------------------------------------------------- */

  @OneToMany(() => Category, category => category.form, { cascade: true })
  categories!: Category[];

  @ManyToOne(() => Form, form => form.children, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentId' })
  parent?: Form;

  @OneToMany(() => Form, form => form.parent)
  children?: Form[];

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'admin_id' })
  admin!: User;

  /* Timestamps -------------------------------------------------------------- */
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
  isAnonymous: any;
  totalViews: any;
  averageCompletionTime: any;
  lastSubmissionAt: any;
  isTemplate: any;
  allowMultipleSubmissions: any;
  maxSubmissions: number | undefined;
  archivedAt: Date | undefined;
  publishedAt: Date | undefined;

  /* Helper Methods --------------------------------------------------------- */

  /**
   * Generate table name based on form slug
   */
  generateTableName(): string {
    if (!this.tableName) {
      this.tableName = `${this.slug.replace(/-/g, '_')}_submissions`;
    }
    return this.tableName;
  }

  /**
   * Check if form schema has been modified since last table creation
   */
  needsTableUpdate(): boolean {
    return this.status === FormStatus.PUBLISHED && !this.tableCreated;
  }
}
