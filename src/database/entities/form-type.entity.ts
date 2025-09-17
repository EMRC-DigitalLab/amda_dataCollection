import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Form } from './form.entity';

export enum FormTypeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

@Entity({ name: 'form_types' })
@Index(['name', 'year'], { unique: true }) // Ensure unique name per year
export class FormType {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string; // e.g., "Finance", "Project", "Assessment", "Survey", "HR Evaluation"

  @Column({ type: 'varchar', length: 100, unique: true })
  slug!: string; // e.g., "finance", "project", "assessment", "survey", "hr-evaluation"

  @Column({ type: 'text', nullable: true })
  description?: string; // Detailed description of what this form type is for

  @Column({ type: 'int' })
  year!: number; // The year this form type is applicable for

  @Column({
    type: 'enum',
    enum: FormTypeStatus,
    default: FormTypeStatus.ACTIVE,
  })
  status!: FormTypeStatus;

  @Column({ type: 'varchar', length: 50, nullable: true })
  color?: string; // Hex color code for UI display (e.g., "#3B82F6")

  @Column({ type: 'varchar', length: 100, nullable: true })
  icon?: string; // Icon name or URL for UI display (e.g., "dollar-sign", "clipboard")

  @Column({ type: 'int', default: 0 })
  sortOrder!: number; // For custom ordering in UI

  @Column({ type: 'boolean', default: true })
  isPublic!: boolean; // Whether this form type is visible to all users

  @Column({ type: 'boolean', default: false })
  isDefault!: boolean; // Whether this is a default/system form type

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>; // Additional configuration or settings

  // Relations
  @OneToMany(() => Form, form => form.formType)
  forms?: Form[];

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Helper Methods
  generateSlug(): string {
    if (!this.slug) {
      this.slug = this.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
    return this.slug;
  }

  isActive(): boolean {
    return this.status === FormTypeStatus.ACTIVE;
  }
}
