// finance-record.entity.ts
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
import { MinigridSite } from './minigrid-site.entity';
import { Question } from './question.entity';
import { User } from './user.entity';

export enum FormStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ON_HOLD = 'ON_HOLD',
}
@Entity({ name: 'form' })
export class Form extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  category!: string;

  @Column({ type: 'varchar', length: 50 })
  slug!: string;

  @Column({
    name: 'date_started',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  dateStarted!: Date;

  @Column({
    name: 'date_completed',
    type: 'timestamp',
    nullable: true,
  })
  dateCompleted?: Date;

  @Column({
    name: 'current_status',
    type: 'enum',
    enum: FormStatus,
    default: FormStatus.PENDING,
  })
  currentStatus!: FormStatus;

  @Column({
    name: 'minigrid_site_id',
    type: 'uuid',
  })
  minigridSiteId!: string;

  @Column({
    name: 'member_id',
    type: 'uuid',
  })
  memberId!: string;

  /* Relations -------------------------------------------------------------- */

  @OneToMany(() => Question, q => q.record, { cascade: true })
  questions!: Question[];

  @ManyToOne(() => MinigridSite, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'minigrid_site_id' })
  minigridSite!: MinigridSite;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  /* Timestamps ------------------------------------------------------------- */
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
