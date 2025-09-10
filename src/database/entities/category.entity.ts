import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Form } from './form.entity';
import { Question } from './question.entity';

@Entity({ name: 'categories' })
export class Category extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string; // e.g., "General", "Technical Parameters"

  @Column({ type: 'varchar', length: 100 })
  slug!: string; // e.g., "general", "technicalParameters"

  @Column({ type: 'int', default: 0 })
  sortOrder!: number; // For ordering categories within a form

  /* Relations -------------------------------------------------------------- */

  @ManyToOne(() => Form, form => form.categories, { onDelete: 'CASCADE' })
  form!: Form;

  @OneToMany(() => Question, question => question.category, { cascade: true })
  questions!: Question[];
}
