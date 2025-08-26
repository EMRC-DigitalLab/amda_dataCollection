// src/database/repositories/user.repository.ts
import { Repository, DataSource } from 'typeorm';
import { User, UserRole, UserStatus } from '../../entities/user.entity';

export class UserRepository extends Repository<User> {
  // In UserRepository constructor:
  constructor(private dataSource: DataSource) {
    super(User, dataSource.manager); // Change this line
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
    });

    return this.save(member);
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
    // The password will be automatically hashed by the @BeforeUpdate hook
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
   * Search users with pagination
   */
  async searchUsers(
    searchTerm: string,
    page: number = 1,
    limit: number = 10,
    role?: UserRole
  ): Promise<{ users: User[]; total: number }> {
    const query = this.createQueryBuilder('user').where(
      'user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search',
      { search: `%${searchTerm}%` }
    );

    if (role) {
      query.andWhere('user.role = :role', { role });
    }

    const [users, total] = await query
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { users, total };
  }
}
