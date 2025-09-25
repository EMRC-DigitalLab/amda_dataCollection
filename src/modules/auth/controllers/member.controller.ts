import { NextFunction, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { MembershipStatus } from '../../../database/entities/member.entity';
import { MemberRepository } from '../../../database/repositories/auth/member.repository';
import { UserRepository } from '../../../database/repositories/auth/user.repository';
import { AppError } from '../../../shared/middleware/error.middleware';
import { ResponseHelper } from '../../../shared/utils/response';
import { CreateMemberDto, UpdateMemberDto } from '../interfaces/member.interface';
import { MemberService } from '../services/member.service';

export class MemberController {
  private memberService: MemberService;

  constructor(private readonly dataSource: DataSource) {
    this.memberService = new MemberService(
      new MemberRepository(dataSource),
      new UserRepository(dataSource)
    );
  }

  getAllMembers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const members = await this.memberService.getAllMembers();
      res.status(200).json({
        success: true,
        message: 'Members retrieved successfully',
        data: members,
      });
    } catch (error: any) {
      ResponseHelper.error(res, error.message, 401);
    }
  };

  getMemberById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const member = await this.memberService.getMemberById(id);
      res.status(200).json({
        success: true,
        message: 'Member retrieved successfully',
        data: member,
      });
    } catch (error: any) {
      ResponseHelper.error(res, error.message, 401);
    }
  };

  getMemberByUserId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const member = await this.memberService.getMemberByUserId(userId);
      res.status(200).json({
        success: true,
        message: 'Member retrieved successfully',
        data: member,
      });
    } catch (error: any) {
      ResponseHelper.error(res, error.message, 401);
    }
  };

  getMemberByEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.params;
      const member = await this.memberService.getMemberByEmail(email);
      res.status(200).json({
        success: true,
        message: 'Member retrieved successfully',
        data: member,
      });
    } catch (error: any) {
      ResponseHelper.error(res, error.message, 401);
    }
  };

  createMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const memberData: CreateMemberDto = req.body;
      const member = await this.memberService.createMember(memberData);
      res.status(201).json({
        success: true,
        message: 'Member created successfully',
        data: member,
      });
    } catch (error: any) {
      ResponseHelper.error(res, error.message, 401);
    }
  };

  updateMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const memberData: UpdateMemberDto = req.body;
      const member = await this.memberService.updateMember(id, memberData);
      res.status(200).json({
        success: true,
        message: 'Member updated successfully',
        data: member,
      });
    } catch (error: any) {
      ResponseHelper.error(res, error.message, 401);
    }
  };

  deleteMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      await this.memberService.deleteMember(id);
      res.status(200).json({
        success: true,
        message: 'Member deleted successfully',
      });
    } catch (error: any) {
      ResponseHelper.error(res, error.message, 401);
    }
  };

  getMembersByStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status } = req.params;
      const members = await this.memberService.getMembersByStatus(status as MembershipStatus);
      res.status(200).json({
        success: true,
        message: 'Members retrieved successfully',
        data: members,
      });
    } catch (error: any) {
      ResponseHelper.error(res, error.message, 401);
    }
  };

  getMembersByCountry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { country } = req.params;
      const members = await this.memberService.getMembersByCountry(country);
      res.status(200).json({
        success: true,
        message: 'Members retrieved successfully',
        data: members,
      });
    } catch (error: any) {
      ResponseHelper.error(res, error.message, 401);
    }
  };

  searchMembers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { query } = req.query;
      if (!query || typeof query !== 'string') {
        throw new AppError('Search query is required', 400);
      }
      const members = await this.memberService.searchMembers(query);
      res.status(200).json({
        success: true,
        message: 'Members retrieved successfully',
        data: members,
      });
    } catch (error: any) {
      ResponseHelper.error(res, error.message, 401);
    }
  };

  updateMemberStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const member = await this.memberService.updateMemberStatus(id, status);
      res.status(200).json({
        success: true,
        message: 'Member status updated successfully',
        data: member,
      });
    } catch (error: any) {
      ResponseHelper.error(res, error.message, 401);
    }
  };

  // NEW VERIFICATION CONTROLLERS
  verifyMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { adminId } = req.body;

      const member = await this.memberService.verifyMember(id, adminId);
      res.status(200).json({
        success: true,
        message: 'Member verified successfully',
        data: member,
      });
    } catch (error: any) {
      ResponseHelper.error(res, error.message, error.statusCode || 500);
    }
  };

  unverifyMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const member = await this.memberService.unverifyMember(id);
      res.status(200).json({
        success: true,
        message: 'Member unverified successfully',
        data: member,
      });
    } catch (error: any) {
      ResponseHelper.error(res, error.message, error.statusCode || 500);
    }
  };

  getAllMembersWithVerificationStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.memberService.getAllMembersWithVerificationStatus();
      res.status(200).json({
        success: true,
        message: 'Members with verification status retrieved successfully',
        data: result,
      });
    } catch (error: any) {
      ResponseHelper.error(res, error.message, error.statusCode || 500);
    }
  };

  getVerifiedMembers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const members = await this.memberService.getVerifiedMembers();
      res.status(200).json({
        success: true,
        message: 'Verified members retrieved successfully',
        data: members,
      });
    } catch (error: any) {
      ResponseHelper.error(res, error.message, error.statusCode || 500);
    }
  };

  getUnverifiedMembers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const members = await this.memberService.getUnverifiedMembers();
      res.status(200).json({
        success: true,
        message: 'Unverified members retrieved successfully',
        data: members,
      });
    } catch (error: any) {
      ResponseHelper.error(res, error.message, error.statusCode || 500);
    }
  };

  getMembersWithFilters = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const {
        status,
        country,
        membershipType,
        search,
        isVerified,
        page = '1',
        limit = '1000000',
      } = req.query;

      const filters = {
        status: status as MembershipStatus,
        country: country as string,
        membershipType: membershipType as string,
        search: search as string,
        isVerified: isVerified ? isVerified === 'true' : undefined,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof typeof filters] === undefined) {
          delete filters[key as keyof typeof filters];
        }
      });

      const result = await this.memberService.getMembersWithFilters(filters);
      res.status(200).json({
        success: true,
        message: 'Members retrieved successfully',
        data: result.members,
        pagination: result.total
          ? {
              total: result.total,
              totalPages: result.totalPages,
              currentPage: result.currentPage,
              limit: filters.limit,
            }
          : undefined,
      });
    } catch (error: any) {
      ResponseHelper.error(res, error.message, 401);
    }
  };

  validateMembershipData = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const memberData = req.body;
      await this.memberService.validateMembershipData(memberData);
      res.status(200).json({
        success: true,
        message: 'Membership data is valid',
      });
    } catch (error: any) {
      ResponseHelper.error(res, error.message, 401);
    }
  };
}
