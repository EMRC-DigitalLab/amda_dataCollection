// @ts-nocheck
import { DataSource, ILike, Repository } from 'typeorm';
import { IMemberRepository } from '../../../modules/auth/interfaces/member.interface';
import { Member, MembershipStatus } from '../../entities/member.entity';
import { User } from '../../entities/user.entity';

export class MemberRepository implements IMemberRepository {
  private repository: Repository<Member>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(Member);
  }

  async findAll(): Promise<Member[]> {
    return await this.repository.find({
      order: { createdAt: 'DESC' },
    });
  }

  
  async findById(id: string): Promise<Member | null> {
    return await this.repository.findOne({
      where: { id },
    });
  }

  async findByPrimaryContactEmail(email: string): Promise<Member | null> {
    return await this.repository.findOne({
      where: { primaryContactEmail: email },
    });
  }

  async updateLastLogin(memberId: string): Promise<void | any> {
    return await this.repository.update({ id: memberId }, { lastLoginAt: new Date() });
  }
  async findByUserId(memberId: string): Promise<Member | null> {
    return await this.repository.findOne({
      where: { id: memberId },
    });
  }

  async findByCompanyName(companyName: string): Promise<Member | null> {
    return await this.repository.findOne({
      where: { companyName },
    });
  }

  async findByEmail(email: string): Promise<Member | null> {
    return await this.repository.findOne({
      where: { primaryContactEmail: email },
    });
  }

  async findByMemberId(memberId: string): Promise<Member | null> {
    return await this.repository.findOne({
      where: { memberId },
    });
  }

  async findByRegistrationNumber(registrationNumber: string): Promise<Member | null> {
    return await this.repository.findOne({
      where: { registrationNumber },
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
      order: { createdAt: 'DESC' },
    });
  }

  async findByCountry(country: string): Promise<Member[]> {
    return await this.repository.find({
      where: { country: ILike(`%${country}%`) },
      order: { createdAt: 'DESC' },
    });
  }

  async verifyMember(memberId: string, adminId?: string): Promise<User> {
    return this.repository.updateVerificationStatus(memberId, true, adminId);
  }

  async setResetPasswordToken(memberId: string, token: string, expires: Date): Promise<void> {
    await this.repository.update(memberId, {
      resetPasswordToken: token,
      resetPasswordExpires: expires,
    });
  }

  async findByResetToken(token: string): Promise<Member | null> {
    const { MoreThan } = await import('typeorm');
    return await this.repository.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: MoreThan(new Date()),
      },
    });
  }

  async updatePassword(memberId: string, newPassword: string): Promise<void> {
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.repository.update(memberId, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });
  }

  /**
   * Unverify a member - REFACTORED
   */
  async unverifyMember(memberId: string): Promise<User> {
    return this.repository.updateVerificationStatus(memberId, false);
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

  

  async findByVerificationStatus(isVerified: boolean): Promise<Member[]> {
    return this.repository.find({
      where: { isVerified },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Updated findMembersWithFilters to include verification status
   */
  async findMembersWithFilters(filters: {
    status?: MembershipStatus;
    country?: string;
    membershipType?: string;
    search?: string;
    isVerified?: boolean;
  }): Promise<Member[]> {
    const queryBuilder = this.repository.createQueryBuilder('member');

    if (filters.status) {
      queryBuilder.andWhere('member.membershipStatus = :status', { status: filters.status });
    }

    if (filters.country) {
      queryBuilder.andWhere('member.country ILIKE :country', { country: `%${filters.country}%` });
    }

    if (filters.membershipType) {
      queryBuilder.andWhere('member.membershipType = :membershipType', {
        membershipType: filters.membershipType,
      });
    }

    if (filters.isVerified !== undefined) {
      queryBuilder.andWhere('member.isVerified = :isVerified', { isVerified: filters.isVerified });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(member.companyName ILIKE :search OR member.primaryContactName ILIKE :search OR member.primaryContactEmail ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    return queryBuilder.orderBy('member.createdAt', 'DESC').getMany();
  }
}
