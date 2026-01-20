import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Member } from './member.entity';
import { User } from './user.entity';

@Entity('refresh_tokens')
@Index(['tokenHash'], { unique: true })
@Index(['userId'])
@Index(['expiresAt'])
@Index(['revokedAt'])
export class RefreshToken extends BaseEntity {
  // ===============================
  // Ownership
  // ===============================

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User | Member;

  // ===============================
  // Token data
  // ===============================

  /**
   * SHA-256 hash of the refresh token
   * NEVER store the raw token
   */
  @Column({ type: 'varchar', length: 255, select: false })
  tokenHash!: string;

  // ===============================
  // Lifecycle tracking
  // ===============================

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt?: Date;

  // ===============================
  // Security metadata (optional but recommended)
  // ===============================

  @Column({ type: 'varchar', length: 255, nullable: true })
  userAgent?: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  // ===============================
  // Computed helpers
  // ===============================

  get isExpired(): boolean {
    return this.expiresAt.getTime() < Date.now();
  }

  get isRevoked(): boolean {
    return !!this.revokedAt;
  }

  get isActive(): boolean {
    return !this.isExpired && !this.isRevoked;
  }

  revoke(): void {
    this.revokedAt = new Date();
  }
}
