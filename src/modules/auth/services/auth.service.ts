// src/modules/auth/services/auth.service.ts
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserRepository } from '../../../database/repositories/auth/user.repository';
import { User, UserRole, UserStatus } from '../../../database/entities/user.entity';
import { DataSource } from 'typeorm';
import { config } from '@/config';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RefreshTokenRequest,
  ChangePasswordRequest,
  ResetPasswordRequest,
  ForgotPasswordRequest,
} from '../interfaces/auth.interface';

export class AuthService {
  private userRepository: UserRepository;

  constructor(private dataSource: DataSource) {
    this.userRepository = new UserRepository(dataSource);
  }

  /**
   * Login for both admin and member
   */
  async login(loginData: LoginRequest): Promise<LoginResponse> {
    const { email, password } = loginData;

    // Find user with password
    const user = await this.userRepository.findByEmailForAuth(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      throw new Error('Account is inactive. Please contact administrator');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await this.userRepository.updateLastLogin(user.id);

    // Generate tokens
    const tokens = this.generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isFirstLogin: user.requiresPasswordChange,
      },
      ...tokens,
    };
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

    // Check if this is the first admin (allow creation if no admins exist)
    const adminCount = await this.userRepository.count({
      where: { role: UserRole.ADMIN },
    });

    // For production, you might want to restrict this further
    if (adminCount > 0) {
      throw new Error('Admin registration is restricted');
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
    const { email } = forgotPasswordData;

    const user = await this.userRepository.findOne({
      where: { email, status: UserStatus.ACTIVE },
    });

    if (!user) {
      // Don't reveal if email exists
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save reset token
    await this.userRepository.setResetPasswordToken(user.id, resetToken, resetExpires);

    // TODO: Send email with reset token
    console.log(`Password reset token for ${email}: ${resetToken}`);
  }

  /**
   * Reset password using token
   */
  async resetPassword(resetPasswordData: ResetPasswordRequest): Promise<void> {
    const { token, newPassword } = resetPasswordData;

    const user = await this.userRepository.findByResetToken(token);
    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    // Update password
    await this.userRepository.updatePassword(user.id, newPassword);
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Generate JWT tokens
   */
  private generateTokens(user: User): {
    accessToken: string;
    refreshToken: string;
  } {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

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
}
