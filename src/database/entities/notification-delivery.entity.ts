// src/database/entities/notification-delivery.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Notification } from './notification.entity';

export enum DeliveryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  BOUNCED = 'bounced',
  OPENED = 'opened',
  CLICKED = 'clicked',
}

@Entity('notification_deliveries')
@Index(['notificationId', 'status'])
@Index(['providerId'])
export class NotificationDelivery {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  notificationId!: string;

  @ManyToOne(() => Notification, notification => notification.deliveries)
  @JoinColumn({ name: 'notificationId' })
  notification!: Notification;

  @Column({ type: 'enum', enum: DeliveryStatus, default: DeliveryStatus.PENDING })
  status!: DeliveryStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  providerId?: string; // External provider's ID (SendGrid, Twilio, etc.)

  @Column({ type: 'varchar', length: 100, nullable: true })
  providerMessageId?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  provider?: string; // sendgrid, twilio, firebase, etc.

  @Column({ type: 'timestamp', nullable: true })
  sentAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  openedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  clickedAt?: Date;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'jsonb', nullable: true })
  providerResponse?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  webhookData?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
