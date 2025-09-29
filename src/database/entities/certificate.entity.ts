// entities/certificate.entity.ts
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Member } from './member.entity';
import { MinigridSite } from './minigrid-site.entity';

@Entity('certificates')
export class Certificate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    length: 50,
    unique: true,
    nullable: false,
  })
  certificateId!: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  recipientName!: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  badgeType?: string;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  completionDate!: Date;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  overallCompletionRate?: number;

  @Column({
    type: 'integer',
    nullable: true,
  })
  totalSitesCount?: number;

  @Column({
    type: 'integer',
    nullable: true,
  })
  completedFormsCount?: number;

  @Column({
    type: 'integer',
    nullable: true,
  })
  totalFormsCount?: number;

  // Foreign Keys
  @Column({
    type: 'uuid',
    nullable: false,
  })
  memberId!: string;

  @Column({
    type: 'uuid',
    nullable: true,
  })
  siteId?: string;

  // Relations
  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'memberId' })
  member!: Member;

  @ManyToOne(() => MinigridSite, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'siteId' })
  site?: MinigridSite;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @BeforeInsert()
  generateCertificateId() {
    if (!this.certificateId) {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substr(2, 8);
      this.certificateId = `AMDA-${timestamp}-${random}`.toUpperCase();
    }
  }
}
