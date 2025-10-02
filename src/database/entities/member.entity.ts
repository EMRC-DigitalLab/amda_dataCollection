//  @ts-nocheck

import * as bcrypt from 'bcryptjs';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MinigridSite } from './minigrid-site.entity';

export enum MembershipType {
  FULL_MEMBER = 'FULL',
  ASSOCIATE_MEMBER = 'ASSOCIATE',
  STUDENT_MEMBER = 'STUDENT_MEMBER',
  CORPORATE_MEMBER = 'CORPORATE_MEMBER',
}

export enum MembershipStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
}

export enum CompanyType {
  PRIVATE_LIMITED = 'PRIVATE_LIMITED',
  PUBLIC_LIMITED = 'PUBLIC_LIMITED',
  PARTNERSHIP = 'PARTNERSHIP',
  SOLE_PROPRIETORSHIP = 'SOLE_PROPRIETORSHIP',
  LIMITED_LIABILITY = 'LIMITED_LIABILITY',
  CORPORATION = 'CORPORATION',
  // COOPERATIVE = 'COOPERATIVE',
  NON_PROFIT = 'NON_PROFIT',
  GOVERNMENT = 'GOVERNMENT',
  NGO = 'NGO',

  OTHER = 'OTHER',
}

export enum BusinessModel {
  UTILITY = 'UTILITY',
  IPP = 'IPP',
  EPC = 'EPC',
  OEM = 'OEM',
  FINANCE = 'FINANCE',
  OTHER = 'OTHER',
}

@Entity('members')
@Index(['primaryContactEmail'], { unique: true })
@Index(['registrationNumber'], { unique: true })
@Index(['companyName'])
@Index(['membershipStatus'])
@Index(['membershipType'])
export class Member {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Unique AMDA Member ID
  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  memberId!: string;

  // Authentication Fields
  @Column({ type: 'varchar', length: 255, nullable: true })
  password!: string;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  emailVerifiedAt?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  resetPasswordToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  resetPasswordExpires?: Date;

  @Column({ type: 'boolean', default: false })
  isFirstLogin?: boolean;

  @Column({ type: 'boolean', default: false })
  isVerified!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  verifiedByAdminId?: string;

  // Company Information
  @Column({ type: 'varchar', length: 255 })
  companyName!: string;

  @Column({
    type: 'enum',
    enum: CompanyType,
    default: CompanyType.PRIVATE_LIMITED,
  })
  companyType!: CompanyType;

  @Column({ type: 'varchar', length: 200, unique: true })
  registrationNumber!: string;

  @Column({ type: 'varchar', length: 4 })
  yearEstablished!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website!: string;

  // Primary Contact Information
  @Column({ type: 'varchar', length: 255 })
  primaryContactName!: string;

  @Column({ type: 'varchar', length: 255 })
  primaryContactTitle!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  primaryContactEmail!: string;

  @Column({ type: 'varchar', length: 200 })
  primaryContactPhone!: string;

  // Company Address
  @Column({ type: 'text' })
  headOfficeAddress!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  city!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  state!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  country!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  postalCode!: string;

  @Column({ type: 'varchar', nullable: true })
  resetPasswordToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  resetPasswordExpires?: Date;

  // AMDA Membership Details
  @Column({
    type: 'enum',
    enum: MembershipType,
    default: MembershipType.FULL_MEMBER,
  })
  membershipType!: MembershipType;

  @Column({ type: 'date', nullable: true })
  membershipStartDate!: Date;

  @Column({
    type: 'enum',
    enum: MembershipStatus,
    default: MembershipStatus.PENDING,
  })
  membershipStatus!: MembershipStatus;

  @Column({ type: 'varchar', length: 200, nullable: true })
  annualDues!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  countriesOfOperation!: string;

  // Business Information
  @Column({
    type: 'enum',
    enum: BusinessModel,
    default: BusinessModel.UTILITY,
  })
  businessModel!: BusinessModel;

  @Column({ type: 'text', nullable: true })
  targetMarkets!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  primaryTechnology!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  minigridCount!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  totalCapacityInstalled!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  customerConnections!: string;

  // FIXED RELATIONSHIP: One Member can have many MinigridSites
  @OneToMany(() => MinigridSite, site => site.member, { cascade: true })
  sites!: MinigridSite[];

  // Additional Information
  @Column({ type: 'text', nullable: true })
  companyMission!: string;

  @Column({ type: 'text', nullable: true })
  keyProjects!: string;

  @Column({ type: 'text', nullable: true })
  partnerships!: string;

  @Column({ type: 'text', nullable: true })
  certifications!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // PASSWORD HANDLING
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

  // VIRTUAL PROPERTIES
  get companyAge(): number {
    return new Date().getFullYear() - parseInt(this.yearEstablished);
  }

  get hasWebsite(): boolean {
    return Boolean(this.website);
  }

  get isActiveMember(): boolean {
    return this.membershipStatus === MembershipStatus.ACTIVE;
  }

  get isPendingMember(): boolean {
    return this.membershipStatus === MembershipStatus.PENDING;
  }

  get isSuspended(): boolean {
    return this.membershipStatus === MembershipStatus.SUSPENDED;
  }

  get isInactive(): boolean {
    return this.membershipStatus === MembershipStatus.INACTIVE;
  }

  get fullAddress(): string {
    const parts = [this.headOfficeAddress, this.city, this.state, this.country];
    if (this.postalCode) parts.push(this.postalCode);
    return parts.filter(Boolean).join(', ');
  }

  get displayName(): string {
    return this.companyName;
  }

  get primaryEmail(): string {
    return this.primaryContactEmail;
  }

  get isEmailVerified(): boolean {
    return this.emailVerifiedAt !== null;
  }

  get isVerifiedMember(): boolean {
    return this.isVerified;
  }

  get requiresPasswordChange(): boolean {
    return this.isFirstLogin ?? false;
  }

  // STATIC METHODS
  static generateMemberId(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `AMDA${timestamp}${random}`;
  }

  // AUTHENTICATION METHODS
  markAsVerified(adminId?: string): void {
    this.isVerified = true;
    this.verifiedAt = new Date();
    if (adminId) {
      this.verifiedByAdminId = adminId;
    }
  }

  markAsUnverified(): void {
    this.isVerified = false;
    this.verifiedAt = null;
    this.verifiedByAdminId = null;
  }

  updateLastLogin(): void {
    this.lastLoginAt = new Date();
    if (this.isFirstLogin) {
      this.isFirstLogin = false;
    }
  }

  // MEMBERSHIP MANAGEMENT METHODS
  activateMembership(): void {
    this.membershipStatus = MembershipStatus.ACTIVE;
    if (!this.membershipStartDate) {
      this.membershipStartDate = new Date();
    }
  }

  suspendMembership(): void {
    this.membershipStatus = MembershipStatus.SUSPENDED;
  }

  deactivateMembership(): void {
    this.membershipStatus = MembershipStatus.INACTIVE;
  }

  // UPDATE METHODS
  updateCompanyInfo(
    data: Partial<{
      companyName: string;
      companyType: CompanyType;
      registrationNumber: string;
      yearEstablished: string;
      website: string;
      headOfficeAddress: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    }>
  ): void {
    Object.assign(this, data);
  }

  updatePrimaryContact(
    data: Partial<{
      primaryContactName: string;
      primaryContactTitle: string;
      primaryContactEmail: string;
      primaryContactPhone: string;
    }>
  ): void {
    Object.assign(this, data);
  }

  updateMembershipInfo(
    data: Partial<{
      membershipType: MembershipType;
      membershipStartDate: Date;
      membershipStatus: MembershipStatus;
      annualDues: string;
      countriesOfOperation: string;
    }>
  ): void {
    Object.assign(this, data);
  }

  updateBusinessInfo(
    data: Partial<{
      businessModel: BusinessModel;
      targetMarkets: string;
      primaryTechnology: string;
      minigridCount: string;
      totalCapacityInstalled: string;
      customerConnections: string;
      companyMission: string;
      keyProjects: string;
      partnerships: string;
      certifications: string;
    }>
  ): void {
    Object.assign(this, data);
  }
}
