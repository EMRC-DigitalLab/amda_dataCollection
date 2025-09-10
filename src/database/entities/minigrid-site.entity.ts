import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('minigrid_sites')
export class MinigridSite {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Site Identification
  @Column({
    type: 'varchar',
    length: 90,
    unique: true,
    nullable: false,
    default: () => `CONCAT('MGS-', SUBSTRING(MD5(RANDOM()::TEXT), 1, 6))`,
  })
  siteId!: string;

  @Column({
    type: 'varchar',
    length: 100,
    default: '',
  })
  name!: string;

  // Location Information
  @Column({
    type: 'varchar',
    length: 100,
    default: 'Tanzania',
  })
  country!: string;

  @Column({
    type: 'varchar',
    length: 100,
    default: 'Tanzania',
  })
  region!: string;

  @Column({
    type: 'varchar',
    length: 100,
    default: '',
  })
  district!: string;

  @Column({
    type: 'varchar',
    length: 100,
    default: '',
  })
  village!: string;

  // GPS Coordinates
  @Column({
    type: 'varchar',
    length: 50,
    default: '00000',
  })
  lat!: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: '00000',
  })
  lon!: string;

  // Technical Information s
  @Column({
    type: 'date',
    default: () => 'CURRENT_DATE',
  })
  commissioningDate!: Date;

  @Column({
    type: 'enum',

    enum: ['Operational', 'Under Construction', 'Planned', 'Maintenance', 'Decommissioned'],
    default: 'Planned',
  })
  status!: 'Operational' | 'Under Construction' | 'Planned' | 'Maintenance' | 'Decommissioned';

  @Column({
    type: 'varchar',
    length: 100,
    default: '',
  })
  generationType!: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: '0',
  })
  installedCapacityKw!: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: '0',
  })
  peakLoadKw!: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: '0',
  })
  connectedCustomers!: string;

  // Customer Mix - storing as separate columns for easier querying
  @Column({
    type: 'varchar',
    length: 10,
    default: '0',
  })
  customerMixResidential!: string;

  @Column({
    type: 'varchar',
    length: 10,
    default: '0',
  })
  customerMixCommercial!: string;

  @Column({
    type: 'varchar',
    length: 10,
    default: '0',
  })
  customerMixProductive!: string;

  // Business Information
  @Column({
    type: 'text',
    default: '',
  })
  tariffModel!: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: '00000',
  })
  licenseNo!: string;

  @Column({
    type: 'varchar',
    length: 100,
    default: '',
  })
  developer!: string;

  // User Relationship
  @Column({
    type: 'uuid',
    nullable: false,
    default: '550e8400-e29b-41d4-a716-446655440000',
  })
  userId!: string; // This is thge memberId, the member who had created this minigridSite

  @JoinColumn({ name: 'userId' })
  user!: User;

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
