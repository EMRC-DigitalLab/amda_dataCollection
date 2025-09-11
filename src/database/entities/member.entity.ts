import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';


export enum MembershipType {
  FULL_MEMBER = 'FULL',
  ASSOCIATE_MEMBER = 'ASSOCIATE',
  STUDENT_MEMBER = 'student-member',
  CORPORATE_MEMBER = 'corporate-member',
}

export enum MembershipStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
}

export enum CompanyType {
  PRIVATE_LIMITED = 'PRIVATE',
  PUBLIC_LIMITED = 'PUBLIC',
  PARTNERSHIP = 'partnership',
  SOLE_PROPRIETORSHIP = 'sole-proprietorship',
  NGO = 'ngo',
  COOPERATIVE = 'cooperative',
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
@Index(['userId'], { unique: true }) // One member per user
export class Member {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Foreign key reference to User table
  @Column({ type: 'uuid' })
  userId!: string;

  // Relationship with User
  @OneToOne(() => User, (user) => user.member, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

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

  @Column({ type: 'varchar', length: 200})
  primaryContactPhone!: string;

  // Company Address
  @Column({ type: 'text' })
  headOfficeAddress!: string;

  @Column({ type: 'varchar', length: 200 })
  city!: string;

  @Column({ type: 'varchar', length: 200 })
  state!: string;

  @Column({ type: 'varchar', length: 200 })
  country!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  postalCode!: string;

  // AMDA Membership Details
  @Column({
    type: 'enum',
    enum: MembershipType,
    default: MembershipType.FULL_MEMBER,
  })
  membershipType!: MembershipType;

  @Column({ type: 'date' })
  membershipStartDate!: Date;

  @Column({
    type: 'enum',
    enum: MembershipStatus,
    default: MembershipStatus.PENDING,
  })
  membershipStatus!: MembershipStatus;

  @Column({ type: 'varchar', length: 200 })
  annualDues!: string;

  @Column({ type: 'varchar', length: 200 })
  countriesOfOperation!: string;

  // Business Information
  @Column({
    type: 'enum',
    enum: BusinessModel,
    default: BusinessModel.UTILITY,
  })
  businessModel!: BusinessModel;

  @Column({ type: 'text' })
  targetMarkets!: string;

  @Column({ type: 'varchar', length: 255 })
  primaryTechnology!: string;

  @Column({ type: 'varchar', length: 200 })
  minigridCount!: string;

  @Column({ type: 'varchar', length: 200 })
  totalCapacityInstalled!: string;

  @Column({ type: 'varchar', length: 200 })
  customerConnections!: string;

  // Additional Information
  @Column({ type: 'text' })
  companyMission!: string;

  @Column({ type: 'text' })
  keyProjects!: string;

  @Column({ type: 'text' })
  partnerships!: string;

  @Column({ type: 'text' })
  certifications!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}