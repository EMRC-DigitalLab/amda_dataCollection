// src/database/entities/user.entity.ts
import * as bcrypt from 'bcryptjs';
import { BeforeInsert, BeforeUpdate, Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum UserRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('users')
@Index(['email'], { unique: true })
@Index(['phoneNumber'], { unique: true })
@Index(['status'])
@Index(['role'])
@Index(['country']) // Added index for country for better query performance
@Index(['isVerified']) // Added index for isVerified for better query performance
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ type: 'varchar', length: 100 })
  lastName!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  phoneNumber!: string;

  @Column({ type: 'varchar', length: 255, select: false })
  password!: string;

  // New field: Countryj
  @Column({ type: 'varchar', length: 100, nullable: true })
  country!: string;

  // New field: Is Verified (for member verification status)
  @Column({ type: 'boolean', default: false })
  isVerified!: boolean;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.MEMBER,
  })
  role!: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status!: UserStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatar?: string;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  emailVerifiedAt?: Date;

  // Optional: Add verification timestamp for when member was verified
  @Column({ type: 'timestamp', nullable: true })
  verifiedAt?: Date;

  // Optional: Track who verified the member (admin ID)
  @Column({ type: 'uuid', nullable: true })
  verifiedByAdminId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  resetPasswordToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  resetPasswordExpires?: Date;

  @Column({ type: 'json', nullable: true })
  preferences?: Record<string, any>;

  // Admin-specific fields for member onboarding
  @Column({ type: 'uuid', nullable: true })
  createdByAdminId?: string;

  @Column({ type: 'boolean', default: false })
  isFirstLogin?: boolean;
  memberId: any;

  // Methods
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }

  // Virtual fields
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  get isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  get isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  get isMember(): boolean {
    return this.role === UserRole.MEMBER;
  }

  // Check if user needs to change password on first login
  get requiresPasswordChange(): boolean {
    return (this.isFirstLogin ?? false) && this.isMember;
  }

  // New getter: Check if member is verified
  get isVerifiedMember(): boolean {
    return this.isMember && this.isVerified;
  }

  // New getter: Check if email is verified
  get isEmailVerified(): boolean {
    return this.emailVerifiedAt !== null;
  }

  // New method: Mark member as verified
  markAsVerified(adminId?: string): void {
    this.isVerified = true;
    this.verifiedAt = new Date();
    if (adminId) {
      this.verifiedByAdminId = adminId;
    }
  }

  // New method: Mark member as unverified
  markAsUnverified(): void {
    this.isVerified = false;
  }
}
