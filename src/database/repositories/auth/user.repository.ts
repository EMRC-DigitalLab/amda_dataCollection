// src/database/repositories/auth/user.repository.ts
import { DataSource, Repository } from 'typeorm';
import { User, UserRole, UserStatus } from '../../entities/user.entity';

export class UserRepository extends Repository<User> {
  findByEmail(email: string): User | PromiseLike<User | null> | null {
    throw new Error('Method not implemented.');
  }
  constructor(private dataSource: DataSource) {
    super(User, dataSource.manager);
  }

  /**
   * Find user by email for authentication
   */
  async findByEmailForAuth(email: string): Promise<User | null> {
    return this.createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  /**
   * Find user by ID with password (for password changes)
   */
  async findByIdWithPassword(id: string): Promise<User | null> {
    return this.createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .getOne();
  }

  /**
   * Find all active users by role
   */
  async findByRole(role: UserRole, status: UserStatus = UserStatus.ACTIVE): Promise<User[]> {
    return this.find({
      where: { role, status },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find all members created by a specific admin
   */
  async findMembersByAdmin(adminId: string): Promise<User[]> {
    return this.find({
      where: {
        createdByAdminId: adminId,
        role: UserRole.MEMBER,
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Check if email already exists
   */
  async emailExists(email: string, excludeId?: string): Promise<boolean> {
    const query = this.createQueryBuilder('user').where('user.email = :email', { email });

    if (excludeId) {
      query.andWhere('user.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  /**
   * Check if phone number already exists
   */
  async phoneExists(phoneNumber: string, excludeId?: string): Promise<boolean> {
    const query = this.createQueryBuilder('user').where('user.phoneNumber = :phoneNumber', {
      phoneNumber,
    });

    if (excludeId) {
      query.andWhere('user.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  /**
   * Create a new member (called by admin)
   */
  async createMember(memberData: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    password: string;
    createdByAdminId: string;
    avatar?: string;
  }): Promise<User> {
    const member = this.create({
      ...memberData,
      role: UserRole.MEMBER,
      status: UserStatus.ACTIVE,
      isFirstLogin: true,
      isVerified: false,
    });

    return this.save(member);
  }

  /**
   * Update verification status - FIXED IMPLEMENTATION
   */
  async updateVerificationStatus(
    memberId: string,
    isVerified: boolean,
    adminId?: string
  ): Promise<User> {
    const member = await this.findOne({ where: { id: memberId } });
    if (!member) {
      throw new Error('Member not found');
    }

    member.isVerified = isVerified;
    if (isVerified && adminId) {
      member.verifiedAt = new Date();
      member.verifiedByAdminId = adminId;
    }

    return this.save(member);
  }

  /**
   * Verify a member - REFACTORED
   */
  async verifyMember(memberId: string, adminId?: string): Promise<User> {
    return this.updateVerificationStatus(memberId, true, adminId);
  }

  /**
   * Unverify a member - REFACTORED
   */
  async unverifyMember(memberId: string): Promise<User> {
    return this.updateVerificationStatus(memberId, false);
  }

  /**
   * Get unverified members (pending verification) - MOVED FROM SERVICE
   */
  async getPendingVerifications(
    page: number = 1,
    limit: number = 10,
    country?: string
  ): Promise<{
    members: User[];
    total: number;
    hasMore: boolean;
  }> {
    const skip = (page - 1) * limit;

    const query = this.createQueryBuilder('user')
      .where('user.role = :role', { role: UserRole.MEMBER })
      .andWhere('user.isVerified = :isVerified', { isVerified: false });

    if (country) {
      query.andWhere('user.country = :country', { country });
    }

    const [members, total] = await query
      .orderBy('user.createdAt', 'ASC') // Oldest first for fairness
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      members,
      total,
      hasMore: skip + members.length < total,
    };
  }

  /**
   * Get verified members - MOVED FROM SERVICE
   */
  async getVerifiedMembers(
    page: number = 1,
    limit: number = 10,
    country?: string
  ): Promise<{
    members: User[];
    total: number;
    hasMore: boolean;
  }> {
    const skip = (page - 1) * limit;

    const query = this.createQueryBuilder('user')
      .where('user.role = :role', { role: UserRole.MEMBER })
      .andWhere('user.isVerified = :isVerified', { isVerified: true });

    if (country) {
      query.andWhere('user.country = :country', { country });
    }

    const [members, total] = await query
      .orderBy('user.verifiedAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      members,
      total,
      hasMore: skip + members.length < total,
    };
  }

  /**
   * Get all members with verification status - NEW METHOD FOR HOOKS
   */
  async getAllMembersWithVerificationStatus(params?: {
    page?: number;
    limit?: number;
    country?: string;
    status?: 'verified' | 'unverified' | 'all';
  }): Promise<{
    members: User[];
    total: number;
    totalPages: number;
    hasMore: boolean;
  }> {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const skip = (page - 1) * limit;

    const query = this.createQueryBuilder('user').where('user.role = :role', {
      role: UserRole.MEMBER,
    });

    if (params?.country) {
      query.andWhere('user.country = :country', { country: params.country });
    }

    if (params?.status === 'verified') {
      query.andWhere('user.isVerified = :isVerified', { isVerified: true });
    } else if (params?.status === 'unverified') {
      query.andWhere('user.isVerified = :isVerified', { isVerified: false });
    }

    const [members, total] = await query
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      members,
      total,
      totalPages,
      hasMore: skip + members.length < total,
    };
  }

  /**
   * Get members verified by a specific admin - MOVED FROM SERVICE
   */
  async getMembersVerifiedByAdmin(
    adminId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    members: User[];
    total: number;
    hasMore: boolean;
  }> {
    const skip = (page - 1) * limit;

    const [members, total] = await this.findAndCount({
      where: {
        role: UserRole.MEMBER,
        verifiedByAdminId: adminId,
        isVerified: true,
      },
      order: { verifiedAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      members,
      total,
      hasMore: skip + members.length < total,
    };
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    await this.update(userId, {
      lastLoginAt: new Date(),
      isFirstLogin: false,
    });
  }

  /**
   * Update user password
   */
  async updatePassword(userId: string, newPassword: string): Promise<void> {
    await this.update(userId, {
      password: newPassword,
      isFirstLogin: false,
      resetPasswordToken: undefined,
      resetPasswordExpires: undefined,
    });
  }

  /**
   * Set password reset token
   */
  async setResetPasswordToken(userId: string, token: string, expires: Date): Promise<void> {
    await this.update(userId, {
      resetPasswordToken: token,
      resetPasswordExpires: expires,
    });
  }

  /**
   * Find user by reset password token
   */
  async findByResetToken(token: string): Promise<User | null> {
    return this.createQueryBuilder('user')
      .addSelect('user.resetPasswordToken')
      .where('user.resetPasswordToken = :token', { token })
      .andWhere('user.resetPasswordExpires > :now', { now: new Date() })
      .getOne();
  }

  /**
   * Update user status
   */
  async updateStatus(userId: string, status: UserStatus): Promise<void> {
    await this.update(userId, { status });
  }

  /**
   * Get user statistics for admin dashboard
   */
  async getUserStats(): Promise<{
    totalUsers: number;
    activeMembers: number;
    inactiveMembers: number;
    totalAdmins: number;
    recentUsers: User[];
  }> {
    const [totalUsers, activeMembers, inactiveMembers, totalAdmins, recentUsers] =
      await Promise.all([
        this.count(),
        this.count({ where: { role: UserRole.MEMBER, status: UserStatus.ACTIVE } }),
        this.count({ where: { role: UserRole.MEMBER, status: UserStatus.INACTIVE } }),
        this.count({ where: { role: UserRole.ADMIN } }),
        this.find({
          order: { createdAt: 'DESC' },
          take: 5,
        }),
      ]);

    return {
      totalUsers,
      activeMembers,
      inactiveMembers,
      totalAdmins,
      recentUsers,
    };
  }

  /**
   * Search users with pagination - IMPROVED
   */
  async searchUsers(
    searchTerm: string,
    page: number = 1,
    limit: number = 10,
    filters?: {
      role?: UserRole;
      isVerified?: boolean;
      country?: string;
    }
  ): Promise<{ users: User[]; total: number }> {
    const query = this.createQueryBuilder('user').where(
      'user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search',
      { search: `%${searchTerm}%` }
    );

    if (filters?.role) {
      query.andWhere('user.role = :role', { role: filters.role });
    }

    if (filters?.isVerified !== undefined) {
      query.andWhere('user.isVerified = :isVerified', { isVerified: filters.isVerified });
    }

    if (filters?.country) {
      query.andWhere('user.country = :country', { country: filters.country });
    }

    const [users, total] = await query
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { users, total };
  }

  /**
   * Get verification statistics - MOVED FROM SERVICE
   */
  async getVerificationStats(): Promise<{
    totalMembers: number;
    verifiedMembers: number;
    unverifiedMembers: number;
    verificationRate: number;
    recentVerifications: User[];
  }> {
    const [totalMembers, verifiedMembers, unverifiedMembers, recentVerifications] =
      await Promise.all([
        this.count({ where: { role: UserRole.MEMBER } }),
        this.count({ where: { role: UserRole.MEMBER, isVerified: true } }),
        this.count({ where: { role: UserRole.MEMBER, isVerified: false } }),
        this.find({
          where: { role: UserRole.MEMBER, isVerified: true },
          order: { verifiedAt: 'DESC' },
          take: 10,
        }),
      ]);

    const verificationRate = totalMembers > 0 ? (verifiedMembers / totalMembers) * 100 : 0;

    return {
      totalMembers,
      verifiedMembers,
      unverifiedMembers,
      verificationRate: Math.round(verificationRate * 100) / 100,
      recentVerifications,
    };
  }
}
