import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { QuestionType } from '../../shared/types/form.types';
import { BaseEntity } from './base.entity';
import { Category } from './category.entity';

@Entity({ name: 'questions' })
export class Question extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /* core fields ---------------------------------------------------------- */
  @Column({ type: 'varchar', length: 255 })
  kpi!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 100 })
  slug!: string;

  @Column({ type: 'boolean', default: false })
  required!: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number; // For ordering questions within a category

  /* dynamic part --------------------------------------------------------- */
  @Column({ type: 'varchar', length: 20 })
  type!: QuestionType;

  // JSON blob that stores whatever extra data the UI needs for this type.
  // Examples:
  //   select   -> { options: ["Yes","No","Maybe"] }
  //   number   -> { min: 0, max: 1000000, step: 1000 }
  //   text     -> { placeholder: "Enter full name", maxLength: 120 }
  @Column({ type: 'jsonb', default: {} })
  options!: Record<string, any>;

  /* relation ------------------------------------------------------------- */
  @ManyToOne(() => Category, category => category.questions, { onDelete: 'CASCADE' })
  category!: Category;
}
