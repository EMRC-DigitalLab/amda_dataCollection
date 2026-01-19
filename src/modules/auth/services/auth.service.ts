// @ts-nocheck
import { config } from '@/config';
import { NotificationChannel, NotificationPriority } from '@/database/entities/notification.entity';
import { NotificationHelper } from '@/shared/utils/notification-helper';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { DataSource } from 'typeorm';
import { AuditLogSeverity } from '../../../database/entities/audit-log.entity';
import { Member } from '../../../database/entities/member.entity';
import { User, UserRole, UserStatus } from '../../../database/entities/user.entity';
import { MemberRepository } from '../../../database/repositories/auth/member.repository';
import { UserRepository } from '../../../database/repositories/auth/user.repository';
import { VerificationResult } from '../../../shared/types/auth.types';
import { AuditLogService } from '../../../shared/utils/form-audit'; // Import AuditLogService
import { logger } from '../../../shared/utils/logger';
import { LoginDto } from '../dtos/login.dto';
import {
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginResponse,
  RefreshTokenRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from '../interfaces/auth.interface';

export class AuthService {
  private userRepository: UserRepository;
  private memberRepository: MemberRepository;
  private auditLogService: AuditLogService;

  constructor(private dataSource: DataSource) {
    this.userRepository = new UserRepository(dataSource);
    this.memberRepository = new MemberRepository(dataSource);
    this.auditLogService = new AuditLogService(dataSource);
  }

  /**
   * Login for both admin and member
   */
  async login(loginDto: LoginDto): Promise<LoginResponse> {
    try {
      const { email, password } = loginDto;

      // First, try to find admin/user by email
      let user: User | null = null;
      let member: Member | null = null;
      let isAdmin = false;

      // Check if it's an email format (contains @)
      if (email.includes('@')) {
        // Try admin/user login
        user = await this.userRepository.findByEmailForAuth(email);
        if (user) {
          isAdmin = true;
        }
      } else {
        // Try member login with memberId
        member = await this.memberRepository.findByMemberId(email);
      }

      // If no user found by email, try to find member by email
      if (!user && !member && email.includes('@')) {
        member = await this.memberRepository.findByEmail(email);
      }


      // If still no user/member found, throw error
      if (!user && !member) {
        throw new Error('Invalid credentials');
      }

      let passwordMatch = false;
      let loginUser: any = null;

      if (isAdmin && user) {
        // Admin login
        passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
          throw new Error('Invalid credentials');
        }

        if (user.status !== UserStatus.ACTIVE) {
          throw new Error('Account is disabled');
        }

        loginUser = {
          id: user.id,
          email: user.email,
          role: 'admin',
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          avatar: user.avatar,
          status: user.status,
          isFirstLogin: user.isFirstLogin,
        };

        // Update last login
        await this.userRepository.updateLastLogin(user.id);
      } else if (member) {
        // Member login
        passwordMatch = await bcrypt.compare(password, member.password);

        if (!passwordMatch) {
          throw new Error('Invalid credentials');
        }

        loginUser = {
          ...member,
          role: 'member',
        };

        // Update last login for member
        await this.memberRepository.updateLastLogin(member.id);
      }

      // Generate tokensss
      const accessTokenPayload = {
        userId: loginUser.id,
        email: loginUser.primaryContactEmail ? loginUser.primaryContactEmail : loginUser.email,
        role: loginUser.memberId ? 'member' : 'admin',
        memberId: loginUser?.memberId ? loginUser?.memberId : null,
      };

      const refreshTokenPayload = {
        userId: loginUser.id,
        email: loginUser.primaryContactEmail ? loginUser.primaryContactEmail : loginUser.email,
        role: loginUser.memberId ? 'member' : 'admin',
        memberId: loginUser?.memberId ? loginUser?.memberId : null,
        type: 'refresh',
      };

      const accessToken = jwt.sign(accessTokenPayload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
      });

      const refreshToken = jwt.sign(refreshTokenPayload, config.jwt.refreshSecret, {
        expiresIn: config.jwt.refreshExpiresIn,
      });

      // Log successful login
      await this.auditLogService.logLogin(
        loginUser.id,
        true,
        undefined, // IP address would need to be passed from controller
        undefined  // User agent would need to be passed from controller
      );

      return {
        accessToken,
        refreshToken,
        user: loginUser,
      };
    } catch (error) {
      // Log failed login (if we identified a user/member)
      const email = loginDto.email;
      // We might not have the ID if user wasn't found, so we log with email in details
      await this.auditLogService.log({
        action: 'LOGIN',
        resourceType: 'Auth',
        severity: AuditLogSeverity.WARNING,
        isSuccess: false,
        errorMessage: error.message,
        details: { email },
      });
      throw error;
    }
  }

  /**
   * Admin creates a new member (not public registration)
   */
  async createMember(memberData: RegisterRequest, adminId: string): Promise<LoginResponse> {
    const { email, phoneNumber, password, firstName, lastName } = memberData;

    // Validate admin exists and is admin
    const admin = await this.userRepository.findOne({
      where: { id: adminId, role: UserRole.ADMIN, status: UserStatus.ACTIVE },
    });
    if (!admin) {
      throw new Error('Only active admins can create members');
    }

    // Check if email already exists
    const emailExists = await this.userRepository.emailExists(email);
    if (emailExists) {
      throw new Error('Email already exists');
    }

    // Check if phone already exists
    const phoneExists = await this.userRepository.phoneExists(phoneNumber);
    if (phoneExists) {
      throw new Error('Phone number already exists');
    }

    // Create member
    const member = await this.userRepository.createMember({
      firstName,
      lastName,
      email,
      phoneNumber,
      password,
      createdByAdminId: adminId,
    });

    // Generate tokens for immediate login
    const tokens = this.generateTokens(member);

    return {
      user: {
        id: member.id,
        email: member.email,
        firstName: member.firstName,
        lastName: member.lastName,
        role: member.role,
        isFirstLogin: member.requiresPasswordChange,
      },
      ...tokens,
    };
  }

  /**
   * Register admin (only for initial setup or by super admin)
   */
  async registerAdmin(adminData: RegisterRequest): Promise<LoginResponse> {
    const { email, phoneNumber, password, firstName, lastName } = adminData;

    // Check if email already exists
    const emailExists = await this.userRepository.emailExists(email);
    if (emailExists) {
      throw new Error('Email already exists');
    }

    // Check if phone already exists
    const phoneExists = await this.userRepository.phoneExists(phoneNumber);
    if (phoneExists) {
      throw new Error('Phone number already exists');
    }

    // Create admin
    const admin = this.userRepository.create({
      firstName,
      lastName,
      email,
      phoneNumber,
      password,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isFirstLogin: false,
    });

    await this.userRepository.save(admin);

    // Generate tokens
    const tokens = this.generateTokens(admin);

    return {
      user: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
        isFirstLogin: false,
      },
      ...tokens,
    };
  }

  /**
   * Change password (especially for first-time member login)
   */
  async changePassword(userId: string, changePasswordData: ChangePasswordRequest): Promise<void> {
    const { oldPassword, newPassword } = changePasswordData;

    // Get user with password
    const user = await this.userRepository.findByIdWithPassword(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // For first-time login, we might skip old password check
    if (!user.isFirstLogin && oldPassword) {
      const isOldPasswordValid = await user.comparePassword(oldPassword);
      if (!isOldPasswordValid) {
        throw new Error('Current password is incorrect');
      }
    }

    // Update password
    await this.userRepository.updatePassword(userId, newPassword);
  }

  /**
   * Refresh access token
   */
  async refreshToken(
    refreshTokenData: RefreshTokenRequest
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { refreshToken } = refreshTokenData;

    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as any;

      // Get user
      const user = await this.userRepository.findOne({
        where: { id: decoded.userId, status: UserStatus.ACTIVE },
      });

      if (!user) {
        throw new Error('User not found or inactive');
      }

      // Generate new tokens
      return this.generateTokens(user);
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Logout
   */
  async logout(userId: string): Promise<void> {
    // In production, add token to blacklist
    console.log(`User ${userId} logged out`);
  }

  /**
   * Request password reset
   */
  async forgotPassword(forgotPasswordData: ForgotPasswordRequest): Promise<void> {
    console.log('=== FORGOT PASSWORD CALLED ===');
    console.log('Email:', forgotPasswordData.email);
    const { email } = forgotPasswordData;

    // Try user first
    const user = await this.userRepository.findOne({
      where: { email, status: UserStatus.ACTIVE },
    });
    console.log('User found:', !!user);

    // Try member if not found
    let member: Member | null = null;
    if (!user) {
      member = await this.memberRepository.findByEmail(email);
      console.log('Member found:', !!member);
    }

    console.log(member, 'this is member');

    // Don't reveal if email exists
    if (!user && !member) {
      console.log('No user/member found - exiting silently');
      return;
    }

    // Generate reset token
    console.log('Generating token...');
    const resetToken = crypto.randomBytes(32).toString('hex');
    console.log('Token:', resetToken);
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000);

    const entityId = user?.id || member?.id;
    if (!entityId) return;

    // Save token
    if (user) {
      await this.userRepository.setResetPasswordToken(entityId, resetToken, resetExpires);
    } else if (member) {
      await this.memberRepository.setResetPasswordToken(entityId, resetToken, resetExpires);
    }

    // Generate reset URL
    const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;

    try {
      await NotificationHelper.sendCustomNotification(
        entityId,
        'password_reset',
        {
          resetToken,
          resetUrl,
          email,
          firstName: user?.firstName || member?.companyName || 'User',
          expiresIn: '15 minutes',
        },
        {
          channel: [NotificationChannel.EMAIL],
          priority: NotificationPriority.HIGH,
          recipientEmail: email,
        }
      );

      logger.info(`Password reset email sent to: ${email}`);
      console.info(`Password reset email sent to: ${email}`);
    } catch (error) {
      console.log(error);
      logger.error('Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  async resetPassword(resetPasswordData: ResetPasswordRequest): Promise<void> {
    const { token, newPassword } = resetPasswordData;

    // Try user
    const user = await this.userRepository.findByResetToken(token);
    let member: Member | null = null;

    if (!user) {
      member = await this.memberRepository.findByResetToken(token);
    }

    if (!user && !member) {
      throw new Error('Invalid or expired reset token');
    }

    const entityId = user?.id || member?.id;
    if (!entityId) throw new Error('Invalid entity');

    // Update password
    if (user) {
      await this.userRepository.updatePassword(entityId, newPassword);
    } else if (member) {
      await this.memberRepository.updatePassword(entityId, newPassword);
    }

    // Send confirmation
    const email = user?.email || member?.primaryContactEmail;
    console.log(email, 'this is email');
    if (email) {
      try {
        await NotificationHelper.sendCustomNotification(
          entityId,
          'password_changed',
          {
            email,
            firstName: user?.firstName || member?.companyName || 'User',
            timestamp: new Date().toLocaleString(),
          },
          {
            channel: [NotificationChannel.EMAIL],
            priority: NotificationPriority.NORMAL,
            recipientEmail: email,
          }
        );
        console.log(`Password change confirmation sent to: ${email}`);

        logger.info(`Password change confirmation sent to: ${email}`);
      } catch (error) {
        console.log(error);
        logger.error('Failed to send confirmation email:', error);
      }
    }
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string): Promise<any> {
    // First try to find as user (admin)
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (user) {
      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    }

    // If not found, try to find as member
    const member = await this.memberRepository.findById(userId);

    if (!member) {
      throw new Error('User not found');
    }

    return {
      ...member,
    };
  }

  /**
   * Generate JWT tokens
   */
  private generateTokens(
    user: User | Member,
    isMember?: boolean
  ): {
    accessToken: string;
    refreshToken: string;
  } {
    let payload: any = {};

    if (isMember) {
      payload = {
        userId: user.id,
        memberId: user?.memberId,
        role: 'member',
      };
    } else {
      payload = {
        userId: user.id,
        email: user.email,
        role: 'admin',
      };
    }

    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    const refreshToken = jwt.sign({ userId: user.id }, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Validate JWT token
   */
  validateToken(token: string): any {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Verify or unverify a member (Admin only)
   */
  async verifyMember(
    memberId: string,
    adminId: string,
    verifyDto: { isVerified: boolean }
  ): Promise<any> {
    // Check if the admin exists and has admin role
    const admin = await this.userRepository.findOne({
      where: { id: adminId, role: UserRole.ADMIN },
    });

    if (!admin) {
      const error: any = new Error('Only admins can verify members');
      error.status = 403;
      throw error;
    }

    // Find the member to verify
    const member = await this.memberRepository.findById(memberId);

    if (!member) {
      const error: any = new Error('Member not found');
      error.status = 404;
      throw error;
    }

    // Check if member is already in the desired verification state
    if (member.isVerified === verifyDto.isVerified) {
      const status = verifyDto.isVerified ? 'verified' : 'unverified';
      const error: any = new Error(`Member is already ${status}`);
      error.status = 400;
      throw error;
    }

    try {
      const updatedMember = await this.memberRepository.updateVerificationStatus(
        memberId,
        verifyDto.isVerified,
        verifyDto.isVerified ? adminId : undefined
      );

      const action = verifyDto.isVerified ? 'verified' : 'unverified';
      const message = `Member ${updatedMember.firstName} ${updatedMember.lastName} has been ${action} successfully`;

      return {
        success: true,
        message,
        member: {
          id: updatedMember.id,
          firstName: updatedMember.firstName,
          lastName: updatedMember.lastName,
          email: updatedMember.email,
          country: updatedMember.country,
          isVerified: updatedMember.isVerified,
          verifiedAt: updatedMember.verifiedAt,
        },
        verifiedBy: verifyDto.isVerified ? admin.firstName + ' ' + admin.lastName : undefined,
        verifiedAt: updatedMember.verifiedAt,
      };
    } catch (error: any) {
      const customError: any = new Error(`Failed to update member verification: ${error.message}`);
      customError.status = 400;
      throw customError;
    }
  }

  /**
   * Bulk verify multiple members
   */
  async bulkVerifyMembers(
    memberIds: string[],
    adminId: string,
    isVerified: boolean = true
  ): Promise<{
    successful: VerificationResult[];
    failed: Array<{ memberId: string; error: string }>;
  }> {
    const successful: VerificationResult[] = [];
    const failed: Array<{ memberId: string; error: string }> = [];

    for (const memberId of memberIds) {
      try {
        const result = await this.verifyMember(memberId, adminId, { isVerified });
        successful.push(result);
      } catch (error: any) {
        failed.push({
          memberId,
          error: error.message,
        });
      }
    }

    return { successful, failed };
  }

  /**
   * Get verification statistics
   */
  async getVerificationStats(): Promise<any> {
    return this.userRepository.getVerificationStats();
  }

  /**
   * Get unverified members (pending verification)
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
    return this.userRepository.getPendingVerifications(page, limit, country);
  }

  /**
   * Get verified members
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
    return this.userRepository.getVerifiedMembers(page, limit, country);
  }

  /**
   * Get members verified by a specific admin
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
    return this.userRepository.getMembersVerifiedByAdmin(adminId, page, limit);
  }

  /**
   * Search members by verification status
   */
  async searchMembers(
    searchTerm: string,
    isVerified?: boolean,
    country?: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    members: User[];
    total: number;
    hasMore: boolean;
  }> {
    const filters: any = { role: UserRole.MEMBER };

    if (isVerified !== undefined) {
      filters.isVerified = isVerified;
    }

    if (country) {
      filters.country = country;
    }

    const membersFromMembersDb = await this.memberRepository.findAll(true);

    const { users: members, total } = await this.userRepository.searchUsers(
      searchTerm,
      page,
      limit,
      filters
    );

    const cumulativeMembers = [...members, ...membersFromMembersDb];

    return {
      members: cumulativeMembers,
      total,
      hasMore: (page - 1) * limit + cumulativeMembers.length < total,
    };
  }

  /**
   * Get verification history for a member
   */
  async getMemberVerificationHistory(memberId: string): Promise<{
    member: User;
    verificationHistory: {
      isVerified: boolean;
      verifiedAt: Date | null;
      verifiedByAdmin: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
      } | null;
    };
  }> {
    const member = await this.userRepository.findOne({
      where: { id: memberId, role: UserRole.MEMBER },
    });

    if (!member) {
      const error: any = new Error('Member not found');
      error.status = 404;
      throw error;
    }

    let verifiedByAdmin = null;
    if (member.verifiedByAdminId) {
      const admin = await this.userRepository.findOne({
        where: { id: member.verifiedByAdminId },
      });

      if (admin) {
        verifiedByAdmin = {
          id: admin.id,
          firstName: admin.firstName,
          lastName: admin.lastName,
          email: admin.email,
        };
      }
    }

    return {
      member,
      verificationHistory: {
        isVerified: member.isVerified,
        verifiedAt: member.verifiedAt || null,
        verifiedByAdmin,
      },
    };
  }
}
