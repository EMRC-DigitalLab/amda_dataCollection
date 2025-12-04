// repositories/certificate.repository.ts
import { DataSource, Repository } from 'typeorm';
import { AppDataSource } from '../../../config';
import { Certificate } from '../../entities/certificate.entity';

export class CertificateRepository {
  private repository: Repository<Certificate>;

  constructor(dataSource: DataSource) {
    this.repository = AppDataSource.getRepository(Certificate);
  }

  async create(certificateData: Partial<Certificate>): Promise<Certificate> {
    const certificate = this.repository.create(certificateData);
    return await this.repository.save(certificate);
  }

  async findById(id: string): Promise<Certificate | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['member'],
    });
  }

  async findByCertificateId(certificateId: string): Promise<Certificate | null> {
    return await this.repository.findOne({
      where: { certificateId },
      relations: ['member'],
    });
  }

  async findByMemberId(memberId: string): Promise<Certificate[]> {
    return await this.repository.find({
      where: { memberId },
      relations: ['member'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(): Promise<Certificate[]> {
    return await this.repository.find({
      relations: ['member'],
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, updateData: Partial<Certificate>): Promise<Certificate | null> {
    await this.repository.update(id, updateData);
    return await this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected !== 0;
  }

  async exists(certificateId: string): Promise<boolean> {
    const count = await this.repository.count({ where: { certificateId } });
    return count > 0;
  }
}
