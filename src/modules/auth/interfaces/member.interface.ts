import {
  BusinessInAfricaType,
  ForProfitType,
  Member,
  MembershipStatus,
  MembershipType,
} from '../../../database/entities/member.entity';
import { MinigridSite } from '../../../database/entities/minigrid-site.entity';
import { CreateMemberDto } from '../dtos/create-member.dto';

export interface IMember {
  // Core Identifiers
  id?: string;
  memberId?: string | null;

  // Authentication & Verification
  email?: string;
  password?: string | null;
  lastLoginAt?: Date | null;
  emailVerifiedAt?: Date | null;
  resetPasswordToken?: string | null;
  resetPasswordExpires?: Date | null;
  isFirstLogin?: boolean;
  isVerified: boolean;
  verifiedAt?: Date | null;
  verifiedByAdminId?: string | null;

  // Company Information
  companyName: string;
  tradingAs?: string | null;
  website?: string | null;

  // Address (Head Office / Billing)
  billingAddress?: string | null;
  city?: string | null;
  country?: string | null;
  postalCode?: string | null;

  // Primary Contact
  contact1Name?: string | null;
  contact1Title?: string | null;
  contact1Email?: string | null;
  contact1Phone?: string | null;

  // Secondary Contact
  contact2Name?: string | null;
  contact2Title?: string | null;
  contact2Email?: string | null;
  contact2Phone?: string | null;

  // Authorized Signatory & Billing Contact
  authorizedSignatory?: string | null;
  billingContactName?: string | null;
  billingContactTitle?: string | null;
  billingContactEmail?: string | null;
  billingContactPhone?: string | null;

  // Business Classification
  forProfit?: ForProfitType | null;
  forProfitOther?: string | null;
  businessInAfrica?: BusinessInAfricaType | null;
  businessInAfricaOther?: string | null;
  countriesOfBusiness?: string | null;
  businessLanguages?: string[] | null;
  businessLanguageOther?: string | null;
  businessCategory?: string | null;
  businessCategoryOther?: string | null;
  businessDescription?: string | null;
  servicesNeeded?: string | null;
  annualTurnover?: string | null;
  shareFinancials?: boolean | null;
  criminalLitigation?: boolean | null;
  civilLitigation?: boolean | null;
  deniedMembership?: boolean | null;
  acknowledgeProcess?: boolean | null;
  dataSharing?: boolean | null;
  signature?: string | null;

  // Membership
  membershipType: MembershipType;
  membershipStartDate: Date | null;
  membershipStatus: MembershipStatus;

  // Relations
  sites?: MinigridSite[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Virtual / Computed (not in DB, but useful in code)
  primaryContactEmail?: string; // often mapped to contact1Email
  registrationNumber?: string; // if you plan to add later

  // Computed getters (you can keep them if you convert entity methods)
  hasWebsite?: boolean;
  isActiveMember?: boolean;
  isPendingMember?: boolean;
  isSuspended?: boolean;
  isInactive?: boolean;
  fullAddress?: string;
  displayName?: string;
  primaryEmail?: string;
  isEmailVerified?: boolean;
  isVerifiedMember?: boolean;
  requiresPasswordChange?: boolean;
}

export interface UpdateMemberDto extends CreateMemberDto {}

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
  createMember(memberData: IMember): Promise<IMember>;
  updateMember(id: string, memberData: IMember): Promise<IMember>;
  deleteMember(id: string): Promise<void>;
  getMembersByStatus(status: MembershipStatus): Promise<Member[]>;
  getMembersByCountry(country: string): Promise<Member[]>;
  searchMembers(query: string): Promise<Member[]>;
  updateMemberStatus(id: string, status: MembershipStatus): Promise<Partial<IMember>>;
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
