// finance-record.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Question } from './question.entity';

@Entity({ name: 'form' })


export class Form extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;                    

  @Column({ type: 'varchar', length: 50 })
  category!: string;                

  @Column({ type: 'varchar', length: 50 })
  slug!: string;                   

  /* Relations -------------------------------------------------------------- */

  @OneToMany(() => Question, (q) => q.record, { cascade: true })
  questions!: Question[];

  /* Timestamps ------------------------------------------------------------- */

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}