// src/database/entities/notification.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
// Add these imports
import { NotificationTemplate } from './notification-template.entity';
import { NotificationDelivery } from './notification-delivery.entity';

export enum NotificationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  WEBHOOK = 'webhook',
  IN_APP = 'in_app',
}

@Entity('notifications')
@Index(['recipientId', 'status'])
@Index(['channel', 'status'])
@Index(['scheduledAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  type!: string; // e.g., 'payment_reminder', 'welcome_email'

  @Column({ 
    type: 'enum', 
    enum: NotificationChannel,
    enumName: 'notification_channel_enum'
  })
  channel!: NotificationChannel;

  @Column({ 
    type: 'enum', 
    enum: NotificationStatus, 
    enumName: 'notification_status_enum',
    default: NotificationStatus.PENDING 
  })
  status!: NotificationStatus;

  @Column({ 
    type: 'enum', 
    enum: NotificationPriority, 
    enumName: 'notification_priority_enum',
    default: NotificationPriority.NORMAL 
  })
  priority!: NotificationPriority;

  // Recipient information
  @Column({ type: 'uuid' })
  @Index()
  recipientId!: string;

  @Column({ type: 'varchar', length: 255 })
  recipientEmail!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  recipientPhone?: string;

  // Content
  @Column({ type: 'varchar', length: 500 })
  subject!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  templateData?: Record<string, any>;

  // Template reference
  @Column({ type: 'uuid', nullable: true })
  templateId?: string;

  @ManyToOne(() => NotificationTemplate, { nullable: true })
  @JoinColumn({ name: 'templateId' })
  template?: NotificationTemplate;

  // Scheduling
  @Column({ type: 'timestamp', nullable: true })
  scheduledAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  sentAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt?: Date;

  // Retry logic
  @Column({ type: 'int', default: 0 })
  retryCount!: number;

  @Column({ type: 'int', default: 3 })
  maxRetries!: number;

  @Column({ type: 'timestamp', nullable: true })
  nextRetryAt?: Date;

  // Error handling
  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'jsonb', nullable: true })
  errorDetails?: Record<string, any>;

  // Delivery tracking
  @OneToMany(() => NotificationDelivery, delivery => delivery.notification)
  deliveries!: NotificationDelivery[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'boolean', default: false })
  isRead!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt?: Date;

  @Column({ type: 'boolean', default: false })
  isDeleted!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date;

  @Column({ type: 'boolean', default: false })
  isArchived!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  archivedAt?: Date;
}
