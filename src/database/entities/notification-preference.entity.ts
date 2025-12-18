// src/database/entities/notification-preference.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { NotificationChannel } from './notification.entity';

@Entity('notification_preferences')
@Index(['userId', 'type', 'channel'])
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  userId!: string;

  @Column({ type: 'varchar', length: 255 })
  type!: string; // e.g., 'payment_reminder', 'marketing'

  @Column({
    type: 'enum',
    enum: NotificationChannel,
    enumName: 'notification_channel_enum',
  })
  channel!: NotificationChannel;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  settings?: Record<string, any>; // Channel-specific settings

  // Scheduling preferences
  @Column({ type: 'time', nullable: true })
  preferredTimeStart?: string; // '09:00:00'

  @Column({ type: 'time', nullable: true })
  preferredTimeEnd?: string; // '18:00:00'

  @Column({ type: 'varchar', length: 50, nullable: true })
  timezone?: string;

  @Column({ type: 'simple-array', nullable: true })
  blockedDays?: string[]; // ['saturday', 'sunday']

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
