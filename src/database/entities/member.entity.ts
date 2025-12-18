// @ts-nocheck

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
  ValueTransformer,
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

export enum ForProfitType {
  YES = 'Yes',
  NO = 'No',
  OTHER = 'Other',
}

export enum BusinessInAfricaType {
  YES = 'Yes',
  NO = 'No',
  OTHER = 'Other',
}

// Custom transformer for boolean fields that may come as "Yes"/"No" strings
const booleanTransformer: ValueTransformer = {
  to: (value: any): boolean => {
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      return lowerValue === 'yes' || lowerValue === 'true' || lowerValue === 'i agree';
    }
    return Boolean(value);
  },
  from: (value: any): boolean => Boolean(value),
};

@Entity('members')
@Index(['email'], { unique: true })
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
  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password!: string;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

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

  // Company Information (Mapped to Frontend)
  @Column({ type: 'varchar', length: 255 })
  companyName!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  tradingAs?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website?: string;

  // Address Information (Billing/Head Office)
  @Column({ type: 'text', nullable: true })
  billingAddress?: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  city?: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  country?: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  postalCode?: string;

  // Primary Contact Information (contact1)
  @Column({ type: 'varchar', length: 255, nullable: true })
  contact1Name?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contact1Title?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contact1Email?: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  contact1Phone?: string;

  // Secondary Contact Information (contact2)
  @Column({ type: 'varchar', length: 255, nullable: true })
  contact2Name?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contact2Title?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contact2Email?: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  contact2Phone?: string;

  // Authorized Signatory
  @Column({ type: 'varchar', length: 255, nullable: true })
  authorizedSignatory?: string;

  // Billing Contact Information
  @Column({ type: 'varchar', length: 255, nullable: true })
  billingContactName?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  billingContactTitle?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  billingContactEmail?: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  billingContactPhone?: string;

  // Business Type (forProfit)
  @Column({
    type: 'enum',
    enum: ForProfitType,
    default: ForProfitType.YES,
    nullable: true,
  })
  forProfit?: ForProfitType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  forProfitOther?: string;

  // Business in Africa
  @Column({
    type: 'enum',
    enum: BusinessInAfricaType,
    default: BusinessInAfricaType.YES,
    nullable: true,
  })
  businessInAfrica?: BusinessInAfricaType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  businessInAfricaOther?: string;

  @Column({ type: 'text', nullable: true })
  countriesOfBusiness?: string;

  // Business Languages (Array stored as JSON)
  @Column({ type: 'simple-json', nullable: true })
  businessLanguages?: string[];

  @Column({ type: 'varchar', length: 255, nullable: true })
  businessLanguageOther?: string;

  // Business Category
  @Column({ type: 'varchar', length: 255, nullable: true })
  businessCategory?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  businessCategoryOther?: string;

  @Column({ type: 'text', nullable: true })
  businessDescription?: string;

  @Column({ type: 'text', nullable: true })
  servicesNeeded?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  annualTurnover?: string;

  @Column({
    type: 'boolean',
    default: false,
    nullable: true,
    transformer: booleanTransformer,
  })
  shareFinancials?: boolean;

  @Column({
    type: 'boolean',
    default: false,
    nullable: true,
    transformer: booleanTransformer,
  })
  criminalLitigation?: boolean;

  @Column({
    type: 'boolean',
    default: false,
    nullable: true,
    transformer: booleanTransformer,
  })
  civilLitigation?: boolean;

  @Column({
    type: 'boolean',
    default: false,
    nullable: true,
    transformer: booleanTransformer,
  })
  deniedMembership?: boolean;

  @Column({
    type: 'boolean',
    default: false,
    nullable: true,
    transformer: booleanTransformer,
  })
  acknowledgeProcess?: boolean;

  @Column({
    type: 'boolean',
    default: false,
    nullable: true,
    transformer: booleanTransformer,
  })
  dataSharing?: boolean;

  @Column({ type: 'text', nullable: true })
  signature?: string;

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

  // FIXED RELATIONSHIP: One Member can have many MinigridSites
  @OneToMany(() => MinigridSite, site => site.member, { cascade: true })
  sites!: MinigridSite[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  primaryContactEmail?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  registrationNumber?: string;

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
    const parts = [this.billingAddress, this.city, this.country];
    if (this.postalCode) parts.push(this.postalCode);
    return parts.filter(Boolean).join(', ');
  }

  get displayName(): string {
    return this.companyName;
  }

  get primaryEmail(): string {
    return this.email;
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
    this.lastLoginAt = new Date();
    if (this.isFirstLogin) {
      this.isFirstLogin = false;
    }
  }

  updateActivity(): void {
    this.lastLoginAt = new Date();
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
      tradingAs: string;
      website: string;
      billingAddress: string;
      city: string;
      country: string;
      postalCode: string;
    }>
  ): void {
    Object.assign(this, data);
  }

  updatePrimaryContact(
    data: Partial<{
      contact1Name: string;
      contact1Title: string;
      contact1Email: string;
      contact1Phone: string;
      contact2Name: string;
      contact2Title: string;
      contact2Email: string;
      contact2Phone: string;
      authorizedSignatory: string;
      billingContactName: string;
      billingContactTitle: string;
      billingContactEmail: string;
      billingContactPhone: string;
    }>
  ): void {
    Object.assign(this, data);
  }

  updateMembershipInfo(
    data: Partial<{
      membershipType: MembershipType;
      membershipStartDate: Date;
      membershipStatus: MembershipStatus;
    }>
  ): void {
    Object.assign(this, data);
  }

  updateBusinessInfo(
    data: Partial<{
      forProfit: ForProfitType;
      forProfitOther: string;
      businessInAfrica: BusinessInAfricaType;
      businessInAfricaOther: string;
      countriesOfBusiness: string;
      businessLanguages: string[];
      businessLanguageOther: string;
      businessCategory: string;
      businessCategoryOther: string;
      businessDescription: string;
      servicesNeeded: string;
      annualTurnover: string;
      shareFinancials: boolean;
      criminalLitigation: boolean;
      civilLitigation: boolean;
      deniedMembership: boolean;
      acknowledgeProcess: boolean;
      dataSharing: boolean;
      signature: string;
    }>
  ): void {
    Object.assign(this, data);
  }
}
