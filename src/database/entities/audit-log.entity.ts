import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

export enum AuditLogSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

@Entity({ name: 'audit_logs' })
export class AuditLog extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  action!: string; // e.g., 'LOGIN', 'CREATE_FORM', 'UPDATE_SETTINGS'

  @Column({ type: 'varchar', length: 100, nullable: true })
  resourceType?: string; // e.g., 'Form', 'User', 'System'

  @Column({ type: 'varchar', length: 100, nullable: true })
  resourceId?: string;

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'uuid', nullable: true })
  memberId?: string;

  @ManyToOne('Member', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'memberId' })
  member?: any;

  @Column({ type: 'jsonb', nullable: true })
  details?: any; // Flexible JSON storage for error stack traces, diffs, etc.

  @Column({
    type: 'enum',
    enum: AuditLogSeverity,
    default: AuditLogSeverity.INFO,
  })
  severity!: AuditLogSeverity;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @Column({ type: 'boolean', default: true })
  isSuccess!: boolean;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
