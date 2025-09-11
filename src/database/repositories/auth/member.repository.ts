import { DataSource, ILike, Repository } from 'typeorm';
import { IMemberRepository } from '../../../modules/auth/interfaces/member.interface';
import { Member, MembershipStatus } from '../../entities/member.entity';

export class MemberRepository implements IMemberRepository {
  private repository: Repository<Member>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(Member);
  }

  async findAll(): Promise<Member[]> {
    return await this.repository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Member | null> {
    return await this.repository.findOne({ 
      where: { id },
      relations: ['user'],
    });
  }

  async findByUserId(userId: string): Promise<Member | null> {
    return await this.repository.findOne({ 
      where: { userId },
      relations: ['user'],
    });
  }

  async findByEmail(email: string): Promise<Member | null> {
    return await this.repository.findOne({ 
      where: { primaryContactEmail: email },
      relations: ['user'],
    });
  }

  async findByRegistrationNumber(registrationNumber: string): Promise<Member | null> {
    return await this.repository.findOne({ 
      where: { registrationNumber },
      relations: ['user'],
    });
  }

  async create(memberData: Partial<Member>): Promise<Member> {
    const member = this.repository.create(memberData);
    return await this.repository.save(member);
  }

  async update(id: string, memberData: Partial<Member>): Promise<Member | null> {
    await this.repository.update(id, memberData);
    return await this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected! > 0;
  }

  async findByMembershipStatus(status: MembershipStatus): Promise<Member[]> {
    return await this.repository.find({
      where: { membershipStatus: status },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByCountry(country: string): Promise<Member[]> {
    return await this.repository.find({
      where: { country: ILike(`%${country}%`) },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async searchMembers(query: string): Promise<Member[]> {
    return await this.repository.find({
      where: [
        { companyName: ILike(`%${query}%`) },
        { primaryContactName: ILike(`%${query}%`) },
        { primaryContactEmail: ILike(`%${query}%`) },
        { city: ILike(`%${query}%`) },
        { state: ILike(`%${query}%`) },
        { country: ILike(`%${query}%`) },
        { primaryTechnology: ILike(`%${query}%`) },
      ],
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findWithPagination(
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC'
  ): Promise<{ members: Member[]; total: number; totalPages: number }> {
    const [members, total] = await this.repository.findAndCount({
      relations: ['user'],
      skip: (page - 1) * limit,
      take: limit,
      order: { [sortBy]: sortOrder },
    });

    return {
      members,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findMembersWithFilters(filters: {
    status?: MembershipStatus;
    country?: string;
    membershipType?: string;
    search?: string;
  }): Promise<Member[]> {
    const queryBuilder = this.repository.createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user');

    if (filters.status) {
      queryBuilder.andWhere('member.membershipStatus = :status', { 
        status: filters.status 
      });
    }

    if (filters.country) {
      queryBuilder.andWhere('member.country ILIKE :country', { 
        country: `%${filters.country}%` 
      });
    }

    if (filters.membershipType) {
      queryBuilder.andWhere('member.membershipType = :membershipType', { 
        membershipType: filters.membershipType 
      });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(member.companyName ILIKE :search OR member.primaryContactName ILIKE :search OR member.primaryContactEmail ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    return await queryBuilder
      .orderBy('member.createdAt', 'DESC')
      .getMany();
  }
}