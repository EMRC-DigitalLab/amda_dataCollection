import {
  BusinessModel,
  CompanyType,
  Member,
  MembershipStatus,
  MembershipType,
} from '../../../database/entities/member.entity';
import { User } from '../../../database/entities/user.entity';

export interface IMember {
  id?: string;
  userId: string;
  user?: User;

  // Company Information
  companyName: string;
  companyType: CompanyType;
  registrationNumber: string;
  yearEstablished: string;
  website?: string;

  // Primary Contact Information
  primaryContactName: string;
  primaryContactTitle: string;
  primaryContactEmail: string;
  primaryContactPhone: string;

  // Company Address
  headOfficeAddress: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;

  // AMDA Membership Details
  membershipType: MembershipType;
  membershipStartDate: Date;
  membershipStatus: MembershipStatus;
  annualDues: string;
  countriesOfOperation: string;

  // Business Information
  businessModel: BusinessModel;
  targetMarkets: string;
  primaryTechnology: string;
  minigridCount: string;
  totalCapacityInstalled: string;
  customerConnections: string;

  // Additional Information
  companyMission: string;
  keyProjects: string;
  partnerships: string;
  certifications: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateMemberDto {
  userId: string;
  companyName: string;
  companyType: CompanyType;
  registrationNumber: string;
  yearEstablished: string;
  website?: string;
  primaryContactName: string;
  primaryContactTitle: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  headOfficeAddress: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  membershipType: MembershipType;
  membershipStartDate: string;
  membershipStatus: MembershipStatus;
  annualDues: string;
  countriesOfOperation: string;
  businessModel: BusinessModel;
  targetMarkets: string;
  primaryTechnology: string;
  minigridCount: string;
  totalCapacityInstalled: string;
  customerConnections: string;
  companyMission: string;
  keyProjects: string;
  partnerships: string;
  certifications: string;
}

export interface UpdateMemberDto {
  companyName?: string;
  companyType?: CompanyType;
  registrationNumber?: string;
  yearEstablished?: string;
  website?: string;
  primaryContactName?: string;
  primaryContactTitle?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  headOfficeAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  membershipType?: MembershipType;
  membershipStartDate?: string;
  membershipStatus?: MembershipStatus;
  annualDues?: string;
  countriesOfOperation?: string;
  businessModel?: BusinessModel;
  targetMarkets?: string;
  primaryTechnology?: string;
  minigridCount?: string;
  totalCapacityInstalled?: string;
  customerConnections?: string;
  companyMission?: string;
  keyProjects?: string;
  partnerships?: string;
  certifications?: string;
}

export interface IMemberRepository {
  findAll(): Promise<Member[]>;
  findById(id: string): Promise<Member | null>;
  findByUserId(userId: string): Promise<Member | null>;
  findByCompanyName(companyName: string): Promise<Member | null>;
  findByMemberId(memberId: string): Promise<Member | null>;
  findByEmail(email: string): Promise<Member | null>;
  findByPrimaryContactEmail(email: string): Promise<Member | null>;
  findByRegistrationNumber(registrationNumber: string): Promise<Member | null>;
  create(memberData: Partial<IMember>): Promise<Member>;
  update(id: string, memberData: Partial<IMember>): Promise<Member | null>;
  delete(id: string): Promise<boolean>;
  findByMembershipStatus(status: MembershipStatus): Promise<Member[]>;
  findByCountry(country: string): Promise<Member[]>;
  searchMembers(query: string): Promise<Member[]>;
  updateLastLogin(memberId: string): Promise<void | any>;
  findByVerificationStatus(isVerified: boolean): Promise<Member[]>;
  verifyMember(memberId: string, adminId?: string): Promise<Member>;
  unverifyMember(memberId: string): Promise<Member>;
  findWithPagination(
    page?: number,
    limit?: number,
    sortBy?: string,
    sortOrder?: 'ASC' | 'DESC'
  ): Promise<{
    members: Member[];
    total: number;
    totalPages: number;
  }>;
  findMembersWithFilters(filters: {
    status?: MembershipStatus;
    country?: string;
    membershipType?: string;
    search?: string;
    isVerified?: boolean;
  }): Promise<Member[]>;
}

export interface IMemberService {
  getAllMembers(): Promise<Member[]>;
  getMemberById(id: string): Promise<Member>;
  getMemberByUserId(userId: string): Promise<Member>;
  getMemberByEmail(email: string): Promise<Member>;
  createMember(memberData: CreateMemberDto): Promise<Member>;
  updateMember(id: string, memberData: UpdateMemberDto): Promise<Member>;
  deleteMember(id: string): Promise<void>;
  getMembersByStatus(status: MembershipStatus): Promise<Member[]>;
  getMembersByCountry(country: string): Promise<Member[]>;
  searchMembers(query: string): Promise<Member[]>;
  updateMemberStatus(id: string, status: MembershipStatus): Promise<Member>;
  getMembersWithFilters(filters: {
    status?: MembershipStatus;
    country?: string;
    membershipType?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    members: Member[];
    total?: number;
    totalPages?: number;
    currentPage?: number;
  }>;
  validateMembershipData(data: Partial<IMember>): Promise<void>;
}
