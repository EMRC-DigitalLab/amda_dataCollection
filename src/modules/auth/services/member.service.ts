import { Member, MembershipStatus } from '../../../database/entities/member.entity';
import { MemberRepository } from '../../../database/repositories/auth/member.repository';
import { UserRepository } from '../../../database/repositories/auth/user.repository';
import { AppError } from '../../../shared/middleware/error.middleware';
import { CreateMemberDto, IMemberService, UpdateMemberDto } from '../interfaces/member.interface';

export class MemberService implements IMemberService {
  constructor(
    private readonly memberRepository: MemberRepository,
    private readonly userRepository: UserRepository
  ) {}

  async getAllMembers(): Promise<Member[]> {
    return await this.memberRepository.findAll();
  }

  async getMemberById(id: string): Promise<Member> {
    const member = await this.memberRepository.findById(id);
    if (!member) {
      throw new AppError(`Member with ID ${id} not found`, 404);
    }
    return member;
  }

  async getMemberByUserId(userId: string): Promise<Member> {
    const member = await this.memberRepository.findByUserId(userId);
    if (!member) {
      throw new AppError(`Member for user ID ${userId} not found`, 404);
    }
    return member;
  }

  async getMemberByEmail(email: string): Promise<Member> {
    const member = await this.memberRepository.findByEmail(email);
    if (!member) {
      throw new AppError(`Member with email ${email} not found`, 404);
    }
    return member;
  }

  async createMember(memberData: CreateMemberDto): Promise<Member> {
    console.log(memberData, 'this is member data');

    // Check if user already has a member profiled
    const existingMemberByCompanyName = await this.memberRepository.findByCompanyName(
      memberData.companyName
    );
    if (existingMemberByCompanyName) {
      throw new AppError('User already has a member profile', 409);
    }

    console.log('reached 1');
    // Check if email already exists
    const existingMemberByEmail = await this.memberRepository.findByEmail(
      memberData.primaryContactEmail
    );
    if (existingMemberByEmail) {
      throw new AppError('Member with this email already exists', 409);
    }

    console.log('reached 2');

    const memberToCreate: Partial<Member | any> = {
      ...memberData,
      // membershipStartDate: new Date(memberData.membershipStartDate),
    };

    return await this.memberRepository.create(memberToCreate);
  }

  async updateMember(id: string, memberData: UpdateMemberDto): Promise<Member> {
    const existingMember = await this.getMemberById(id);

    // Check if email is being updated and if it already exists
    if (
      memberData.primaryContactEmail &&
      memberData.primaryContactEmail !== existingMember.primaryContactEmail
    ) {
      const memberWithEmail = await this.memberRepository.findByEmail(
        memberData.primaryContactEmail
      );
      if (memberWithEmail && memberWithEmail.id !== id) {
        throw new AppError('Member with this email already exists', 409);
      }
    }

    // Check if registration number is being updated and if it already exists
    if (
      memberData.registrationNumber &&
      memberData.registrationNumber !== existingMember.registrationNumber
    ) {
      const memberWithRegNo = await this.memberRepository.findByRegistrationNumber(
        memberData.registrationNumber
      );
      if (memberWithRegNo && memberWithRegNo.id !== id) {
        throw new AppError('Member with this registration number already exists', 409);
      }
    }

    // @ts-ignore

    const updateData: Partial<Member> = { ...memberData };

    // Convert date string to Date object if provided
    if (memberData.membershipStartDate) {
      updateData.membershipStartDate = new Date(memberData.membershipStartDate);
    }

    const updatedMember = await this.memberRepository.update(id, updateData);
    if (!updatedMember) {
      throw new AppError(`Member with ID ${id} not found`, 404);
    }

    return updatedMember;
  }

  async deleteMember(id: string): Promise<void> {
    const member = await this.getMemberById(id);
    const deleted = await this.memberRepository.delete(id);
    if (!deleted) {
      throw new AppError(`Failed to delete member with ID ${id}`, 500);
    }
  }

  async getMembersByStatus(status: MembershipStatus): Promise<Member[]> {
    return await this.memberRepository.findByMembershipStatus(status);
  }

  async getMembersByCountry(country: string): Promise<Member[]> {
    return await this.memberRepository.findByCountry(country);
  }

  async searchMembers(query: string): Promise<Member[]> {
    return await this.memberRepository.searchMembers(query);
  }

  async updateMemberStatus(id: string, status: MembershipStatus): Promise<Member> {
    return await this.updateMember(id, { membershipStatus: status });
  }

  // NEW VERIFICATION METHODS
  async verifyMember(id: string, adminId?: string): Promise<Member> {
    const member = await this.getMemberById(id);

    // Use the entity method to mark as verified
    member.markAsVerified(adminId);

    const updatedMember = await this.memberRepository.update(id, {
      isVerified: member.isVerified,
      verifiedAt: member.verifiedAt,
      verifiedByAdminId: member.verifiedByAdminId,
    });

    if (!updatedMember) {
      throw new AppError(`Failed to verify member with ID ${id}`, 500);
    }

    return updatedMember;
  }

  async unverifyMember(id: string): Promise<Member> {
    const member = await this.getMemberById(id);

    // Use the entity method to mark as unverified
    member.markAsUnverified();

    const updatedMember = await this.memberRepository.update(id, {
      isVerified: member.isVerified,
      verifiedAt: member.verifiedAt,
      verifiedByAdminId: member.verifiedByAdminId,
    });

    if (!updatedMember) {
      throw new AppError(`Failed to unverify member with ID ${id}`, 500);
    }

    return updatedMember;
  }

  async getAllMembersWithVerificationStatus(): Promise<{
    verified: Member[];
    unverified: Member[];
    total: number;
    verifiedCount: number;
    unverifiedCount: number;
  }> {
    const allMembers = await this.memberRepository.findAll();

    const verified = allMembers.filter(member => member.isVerified);
    const unverified = allMembers.filter(member => !member.isVerified);

    return {
      verified,
      unverified,
      total: allMembers.length,
      verifiedCount: verified.length,
      unverifiedCount: unverified.length,
    };
  }

  async getVerifiedMembers(): Promise<Member[]> {
    return await this.memberRepository.findByVerificationStatus(true);
  }

  async getUnverifiedMembers(): Promise<Member[]> {
    return await this.memberRepository.findByVerificationStatus(false);
  }

  async getMembersWithFilters(filters: {
    status?: MembershipStatus;
    country?: string;
    membershipType?: string;
    search?: string;
    isVerified?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    members: Member[];
    total?: number;
    totalPages?: number;
    currentPage?: number;
  }> {
    if (filters.page && filters.limit) {
      const result = await this.memberRepository.findWithPagination(filters.page, filters.limit);
      return {
        ...result,
        currentPage: filters.page,
      };
    }

    const members = await this.memberRepository.findMembersWithFilters(filters);
    return { members };
  }

  async validateMembershipData(data: Partial<Member>): Promise<void> {
    if (data.primaryContactEmail) {
      const existingMember = await this.memberRepository.findByEmail(data.primaryContactEmail);
      if (existingMember) {
        throw new AppError('Email already exists', 409);
      }
    }

    if (data.registrationNumber) {
      const existingMember = await this.memberRepository.findByRegistrationNumber(
        data.registrationNumber
      );
      if (existingMember) {
        throw new AppError('Registration number already exists', 409);
      }
    }
  }
}
