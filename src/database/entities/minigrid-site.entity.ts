import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Form } from './form.entity';

@Entity('minigrid_sites')
export class MinigridSite {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  name!: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  location?: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  @Column({
    type: 'boolean',
    default: true,
  })
  isActive!: boolean;

  // Company Information
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  companyName?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  companyType?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  registrationNumber?: string;

  @Column({
    type: 'varchar',
    length: 4,
    nullable: true,
  })
  yearEstablished?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  website?: string;

  // Primary Contact Information
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  primaryContactName?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  primaryContactTitle?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  primaryContactEmail?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  primaryContactPhone?: string;

  // Company Address
  @Column({
    type: 'text',
    nullable: true,
  })
  headOfficeAddress?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  city?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  state?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  country?: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  postalCode?: string;

  // AMDA Membership Details
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  membershipType?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  membershipStartDate?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  membershipStatus?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  annualDues?: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  countriesOfOperation?: string;

  // Business Information
  @Column({
    type: 'text',
    nullable: true,
  })
  businessModel?: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  targetMarkets?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  primaryTechnology?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  minigridCount?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  totalCapacityInstalled?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  customerConnections?: string;

  // Additional Information
  @Column({
    type: 'text',
    nullable: true,
  })
  companyMission?: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  keyProjects?: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  partnerships?: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  certifications?: string;

  // Relations
  @OneToMany(() => Form, form => form.minigridSiteId)
  forms!: Form[];

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
  })
  updatedAt!: Date;
}
