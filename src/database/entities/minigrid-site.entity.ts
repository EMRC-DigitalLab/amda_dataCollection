import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Member } from './member.entity';


export enum MinigridSiteStatus {
  OPERATIONAL = 'Operational',
  UNDER_CONSTRUCTION = 'Under Construction',
  PLANNED = 'Planned',
  MAINTENANCE = 'Maintenance',
  DECOMMISSIONED = 'Decommissioned',
}


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

  // Technical Information
  @Column({
    type: 'date',
    default: () => 'CURRENT_DATE',
  })
  commissioningDate!: Date;

 @Column({
    type: 'varchar',
    enum: MinigridSiteStatus,
    default: MinigridSiteStatus.PLANNED,
  })
  status!: MinigridSiteStatus;


  @Column({
    type: 'varchar',
    length: 100,
    default: '',
  })
  generationType!: string;

  @Column({
    type: 'varchar',
    length: 100,
    default: '0',
  })
  installedCapacityKw!: string;

  @Column({
    type: 'varchar',
    length: 100,
    default: '0',
  })
  peakLoadKw!: string;

  @Column({
    type: 'varchar',
    length: 100,
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

  // Year Added - Automatically set to current year when site is created
  @Column({
    type: 'int',
    default: () => 'EXTRACT(YEAR FROM CURRENT_DATE)',
    nullable: false,
  })
  yearAdded!: number;

  @Column({
    type: 'text',
    nullable: false,
  })
  memberId!: string;

  @Column({
    type: 'uuid',
    nullable: false,
  })
  memberUuid!: string;

  @ManyToOne(() => Member, member => member.sites, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'memberUuid' })
  member!: Member;

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
